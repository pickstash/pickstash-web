'use client'

import { useRef, useState } from 'react'
import { uploadOptionImage } from '@/lib/api/options'
import { fetchLinkPreview } from '@/lib/api/unfurl'
import { cleanBlocks, LINK_KINDS, linkHref, linkKindOf, splitPastedLink, type OptionBlock } from '@/lib/domain/option-content'

interface OptionFormProps {
  boxId: string
  initialName?: string
  initialContent?: OptionBlock[]
  isPending?: boolean
  onSubmit: (data: { name: string; content: OptionBlock[] }) => void
  onCancel?: () => void
  submitLabel?: string
}

const MAX_IMAGES = 6
const MAX_BLOCKS = 20

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export function OptionForm({
  boxId,
  initialName = '',
  initialContent = [],
  isPending,
  onSubmit,
  onCancel,
  submitLabel = '저장',
}: OptionFormProps) {
  const [name, setName] = useState(initialName)
  const [blocks, setBlocks] = useState<OptionBlock[]>(initialContent)
  const [uploading, setUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [linkLoading, setLinkLoading] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 비동기(OG 로드) 후 최신 상태를 읽기 위한 ref
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks
  const nameRef = useRef(name)
  nameRef.current = name

  const imageCount = blocks.filter(b => b.type === 'image').length
  const atBlockLimit = blocks.length >= MAX_BLOCKS

  function updateBlock(id: string, patch: Record<string, unknown>) {
    setBlocks(prev => prev.map(b => (b.id === id ? ({ ...b, ...patch } as OptionBlock) : b)))
  }

  function removeBlock(id: string) {
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  function moveBlock(index: number, dir: -1 | 1) {
    setBlocks(prev => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function addText() {
    if (atBlockLimit) return
    setBlocks(prev => [...prev, { type: 'text', id: newId(), text: '' }])
  }

  function addLink() {
    if (atBlockLimit) return
    setBlocks(prev => [...prev, { type: 'link', id: newId(), url: '', label: '' }])
  }

  // 이 링크가 '첫 번째 링크 블록'이고 선택지 이름이 비어 있으면, 주어진 텍스트를 선택지 이름으로 채운다.
  // (OG 제목·붙여넣은 글씨 → 선택지 이름 자동채움용. 라벨=메모와는 무관.)
  function maybeFillNameFrom(blockId: string, text: string) {
    if (!text.trim() || name.trim()) return
    const firstLinkId = blocks.find(b => b.type === 'link')?.id
    if (blockId === firstLinkId) setName(text.slice(0, 50))
  }

  // URL이 정해진 채로 링크 블록을 추가하고 바로 미리보기·이름 자동채움을 태운다.
  function addLinkWithUrl(url: string) {
    if (atBlockLimit) return
    const id = newId()
    setBlocks(prev => [...prev, { type: 'link', id, url, label: '' }])
    loadLinkPreview(id, url)
  }

  // "글씨 URL" 형태로 붙여넣어졌으면 URL만 취한다. 섞인 글씨는 '이름' 후보로만 쓰고 라벨(메모)엔 안 넣는다.
  function normalizePastedLink(id: string, raw: string): string {
    const split = splitPastedLink(raw)
    if (!split) return raw.trim()
    updateBlock(id, { url: split.url })
    if (split.label) maybeFillNameFrom(id, split.label)
    return split.url
  }

  // 링크 URL 확정 시 OG 미리보기를 가져와 블록에 저장 (섞여 들어온 글씨는 먼저 정리)
  async function loadLinkPreview(id: string, rawUrl: string) {
    const url = normalizePastedLink(id, rawUrl)
    if (!url) {
      updateBlock(id, { title: undefined, description: undefined, image: undefined })
      return
    }
    setLinkLoading(prev => ({ ...prev, [id]: true }))
    // 스킴 없는 맨 도메인(naver.com)도 https://를 붙여 절대 URL로 조회
    const preview = await fetchLinkPreview(linkHref(url))
    updateBlock(id, {
      title: preview.title,
      description: preview.description,
      image: preview.image,
    })
    // OG 제목은 '선택지 이름'에만 자동 반영(첫 링크 & 이름 비었을 때). 라벨(메모)은 사용자가 직접 쓴다.
    if (preview.title) {
      const firstLinkId = blocksRef.current.find(b => b.type === 'link')?.id
      if (id === firstLinkId && !nameRef.current.trim()) setName(preview.title.slice(0, 50))
    }
    setLinkLoading(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  async function handleAddImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setImageError(null)

    const imageRoom = MAX_IMAGES - imageCount
    const room = Math.min(imageRoom, MAX_BLOCKS - blocks.length)
    if (room <= 0) {
      setImageError(
        imageRoom <= 0
          ? `사진은 최대 ${MAX_IMAGES}장까지 올릴 수 있어요.`
          : `블록은 최대 ${MAX_BLOCKS}개까지 넣을 수 있어요.`,
      )
      return
    }
    const toUpload = files.slice(0, room)
    if (toUpload.some(f => f.size > 5 * 1024 * 1024)) {
      setImageError('5MB 이하의 이미지만 올릴 수 있어요.')
      return
    }

    setUploading(true)
    try {
      const urls = await Promise.all(toUpload.map(f => uploadOptionImage(boxId, f)))
      setBlocks(prev => [...prev, ...urls.map(url => ({ type: 'image' as const, id: newId(), url }))])
    } catch {
      setImageError('사진 업로드에 실패했어요.')
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), content: cleanBlocks(blocks) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-32">
      {/* 이름 */}
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
          선택지 이름 <span className="text-tomato">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onPaste={e => {
            // "네이버 https://..." 처럼 글씨+링크가 섞여 복사됐으면 이름/링크로 자동 분리
            const split = splitPastedLink(e.clipboardData.getData('text'))
            if (!split) return // 순수 텍스트면 일반 붙여넣기
            e.preventDefault()
            if (split.label && !name.trim()) setName(split.label.slice(0, 50))
            addLinkWithUrl(split.url)
          }}
          maxLength={50}
          placeholder="링크 붙여넣기 또는 이름 입력"
          className="w-full rounded-field border-[1.5px] border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none focus:ring-[3px] focus:ring-butter-tint"
          required
        />
      </div>

      {/* 본문 블록 */}
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">본문</label>

        {blocks.length === 0 ? (
          <p className="rounded-field border border-dashed border-[#D9D6C2] bg-paper/60 px-4 py-6 text-center text-[12.5px] text-ink-faint">
            글·사진·링크를 자유롭게 배치하세요.
          </p>
        ) : (
          <div className="space-y-2.5">
            {blocks.map((block, i) => (
              <div key={block.id} className="rounded-[16px] border border-line bg-paper p-3">
                {/* 블록 컨트롤 */}
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-ink-faint">
                    {block.type === 'text' ? '글' : block.type === 'image' ? '사진' : '링크'}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveBlock(i, -1)}
                      disabled={i === 0}
                      aria-label="위로"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft disabled:opacity-30 active:bg-cream"
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(i, 1)}
                      disabled={i === blocks.length - 1}
                      aria-label="아래로"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft disabled:opacity-30 active:bg-cream"
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      aria-label="블록 삭제"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-ink-faint active:bg-tomato-tint"
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>

                {/* 블록 본체 */}
                {block.type === 'text' && (
                  <textarea
                    value={block.text}
                    onChange={e => updateBlock(block.id, { text: e.target.value })}
                    rows={3}
                    maxLength={1000}
                    placeholder="내용을 입력하세요"
                    className="w-full resize-none rounded-field border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
                  />
                )}

                {block.type === 'image' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={block.url}
                    alt="첨부 사진"
                    className="max-h-64 w-full rounded-[12px] border border-line object-cover"
                  />
                )}

                {block.type === 'link' && (
                  <div className="space-y-2">
                    {/* type=text: naver.com 처럼 스킴 없는 도메인도 막지 않음(제출 시 브라우저가 반려하지 않게) */}
                    <input
                      type="text"
                      inputMode="url"
                      value={block.url}
                      onChange={e => updateBlock(block.id, { url: e.target.value })}
                      onPaste={e => {
                        // "네이버 https://..." 처럼 글씨가 섞여 복사됐으면 URL만 깔끔히 정리
                        const text = e.clipboardData.getData('text')
                        const split = splitPastedLink(text)
                        if (!split || split.url === text.trim()) return // 순수 URL이면 기본 붙여넣기
                        e.preventDefault()
                        loadLinkPreview(block.id, text)
                      }}
                      onBlur={e => loadLinkPreview(block.id, e.target.value)}
                      placeholder="링크 주소 붙여넣기"
                      className="w-full rounded-field border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
                    />
                    {linkLoading[block.id] && (
                      <p className="text-[11.5px] text-ink-faint">미리보기 불러오는 중…</p>
                    )}
                    {!linkLoading[block.id] && (block.title || block.image) && (
                      <div className="flex gap-2.5 rounded-[12px] border border-line bg-cream/40 p-2">
                        {block.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={block.image} alt="" className="h-12 w-12 shrink-0 rounded-[8px] border border-line object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-bold text-ink">{block.title}</p>
                          {block.description && (
                            <p className="line-clamp-1 text-[11px] text-ink-soft">{block.description}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {/* 아이콘(셀렉트) + 라벨을 한 줄로 */}
                    <div className="flex gap-2">
                      <div className="relative shrink-0">
                        <select
                          value={linkKindOf(block)}
                          onChange={e => updateBlock(block.id, { icon: e.target.value })}
                          aria-label="링크 종류"
                          className="h-full appearance-none rounded-field border-[1.5px] border-line bg-paper py-2.5 pl-3 pr-7 text-sm font-bold text-ink focus:border-butter-dark focus:outline-none"
                        >
                          {LINK_KINDS.map(k => (
                            <option key={k.kind} value={k.kind}>
                              {k.emoji} {k.label}
                            </option>
                          ))}
                        </select>
                        <svg
                          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint"
                          width="12"
                          height="12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={block.label}
                        onChange={e => updateBlock(block.id, { label: e.target.value })}
                        maxLength={50}
                        placeholder="메모 (예: 최저가·후기 좋음)"
                        className="min-w-0 flex-1 rounded-field border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 블록 추가 버튼 */}
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addText}
            disabled={atBlockLimit}
            className="rounded-full border-[1.5px] border-line bg-paper px-3.5 py-2 text-[12.5px] font-bold text-ink active:bg-cream disabled:opacity-40"
          >
            ＋ 글
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || imageCount >= MAX_IMAGES || atBlockLimit}
            className="rounded-full border-[1.5px] border-line bg-paper px-3.5 py-2 text-[12.5px] font-bold text-ink active:bg-cream disabled:opacity-40"
          >
            {uploading ? '올리는 중…' : '＋ 사진'}
          </button>
          <button
            type="button"
            onClick={addLink}
            disabled={atBlockLimit}
            className="rounded-full border-[1.5px] border-line bg-paper px-3.5 py-2 text-[12.5px] font-bold text-ink active:bg-cream disabled:opacity-40"
          >
            ＋ 링크
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleAddImages}
        />
        {imageError && <p className="mt-1.5 text-xs text-tomato">{imageError}</p>}
      </div>

      {/* 버튼 — 하단 고정(fixed) 2단 (취소 · 저장). 모바일=화면 하단 풀폭, PC=폰 프레임 하단에 430px 정렬 */}
      <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 gap-2.5 bg-cream px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] xl:inset-x-auto xl:bottom-10 xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2 xl:rounded-b-[30px]">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-field border border-line py-3.5 text-sm font-bold text-ink-soft active:opacity-70"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={isPending || uploading || !name.trim()}
          className={`rounded-field bg-ink py-3.5 text-sm font-bold text-cream active:opacity-80 disabled:opacity-50 ${onCancel ? '' : 'col-span-2'}`}
        >
          {isPending ? '저장 중...' : uploading ? '사진 올리는 중...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
