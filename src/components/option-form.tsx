'use client'

import { useRef, useState } from 'react'
import { uploadOptionImage } from '@/lib/api/options'
import { fetchLinkPreview } from '@/lib/api/unfurl'
import { cleanBlocks, LINK_KINDS, linkKindOf, splitPastedLink, type OptionBlock } from '@/lib/domain/option-content'

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
  const linkCount = blocks.filter(b => b.type === 'link').length
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

  // 이 링크가 '첫 번째 링크 블록'이고 선택지 이름이 비어 있으면, 라벨을 선택지 이름으로도 채운다.
  // (링크 여러 개면 첫 링크의 라벨만 이름에 반영)
  function maybeSyncNameFromLabel(blockId: string, label: string) {
    if (!label.trim() || name.trim()) return
    const firstLinkId = blocks.find(b => b.type === 'link')?.id
    if (blockId === firstLinkId) setName(label.slice(0, 50))
  }

  // 링크 라벨 변경 — 블록에 반영 + 첫 링크면 선택지 이름 동기화
  function updateLinkLabel(id: string, label: string) {
    updateBlock(id, { label })
    maybeSyncNameFromLabel(id, label)
  }

  // URL이 정해진 채로 링크 블록을 추가하고 바로 미리보기·이름 자동채움을 태운다.
  function addLinkWithUrl(url: string, label = '') {
    if (atBlockLimit) return
    const id = newId()
    setBlocks(prev => [...prev, { type: 'link', id, url, label }])
    loadLinkPreview(id, url)
  }

  // "글씨 URL" 형태로 붙여넣어졌으면 URL/라벨로 분리한다. 정리된 URL 반환.
  function normalizePastedLink(id: string, raw: string): string {
    const split = splitPastedLink(raw)
    if (!split) return raw.trim()
    updateBlock(id, split.label ? { url: split.url, label: split.label } : { url: split.url })
    if (split.label) maybeSyncNameFromLabel(id, split.label)
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
    const preview = await fetchLinkPreview(url)
    updateBlock(id, {
      title: preview.title,
      description: preview.description,
      image: preview.image,
    })
    // 라벨이 비어 있으면(=글씨가 섞여 있지 않았으면) OG 제목을 라벨로 채우고,
    // 첫 링크면 선택지 이름에도 반영한다. (붙여넣은 글씨 라벨이 있으면 그대로 둠)
    const cur = blocksRef.current.find(b => b.id === id)
    if (preview.title && cur?.type === 'link' && !cur.label.trim()) {
      const lbl = preview.title.slice(0, 50)
      updateBlock(id, { label: lbl })
      const firstLinkId = blocksRef.current.find(b => b.type === 'link')?.id
      if (id === firstLinkId && !nameRef.current.trim()) setName(lbl)
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
    <form onSubmit={handleSubmit} className="space-y-5">
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
            addLinkWithUrl(split.url, split.label)
          }}
          maxLength={50}
          placeholder="링크 붙여넣기 또는 이름 입력"
          className="w-full rounded-field border-[1.5px] border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none focus:ring-[3px] focus:ring-butter-tint"
          required
        />
        <p className="mt-1 text-[11.5px] text-ink-faint">
          쇼핑·유튜브·지도 링크를 여기 붙여넣으면 이름·미리보기가 자동으로 채워져요.
        </p>
      </div>

      {/* 본문 블록 */}
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">본문</label>

        {blocks.length === 0 ? (
          <p className="rounded-field border border-dashed border-[#D9D6C2] bg-paper/60 px-4 py-6 text-center text-[12.5px] text-ink-faint">
            글·사진·링크를 자유롭게 배치하세요. 유튜브·지도·쇼핑 링크는 붙여넣으면 미리보기가 떠요.
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
                    <input
                      type="url"
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
                      placeholder="https://"
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
                    <div>
                      <p className="mb-1 text-[11px] font-semibold text-ink-faint">아이콘</p>
                      <div className="flex flex-wrap gap-1.5">
                        {LINK_KINDS.map(k => {
                          const active = linkKindOf(block) === k.kind
                          return (
                            <button
                              key={k.kind}
                              type="button"
                              onClick={() => updateBlock(block.id, { icon: k.kind })}
                              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-bold transition-colors ${
                                active ? 'border-butter-dark bg-butter-tint text-ink' : 'border-line bg-paper text-ink-soft'
                              }`}
                            >
                              <span>{k.emoji}</span>
                              {k.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    {/* 라벨은 한 선택지에 링크가 2개 이상일 때만 (구분이 실제로 필요할 때). */}
                    {linkCount >= 2 && (
                      <input
                        type="text"
                        value={block.label}
                        onChange={e => updateLinkLabel(block.id, e.target.value)}
                        maxLength={50}
                        placeholder="이 링크가 뭔지 (예: 최저가, 공식몰, 리뷰)"
                        className="w-full rounded-field border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
                      />
                    )}
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

      {/* 버튼 */}
      <div className="space-y-2 pt-2">
        <button
          type="submit"
          disabled={isPending || uploading || !name.trim()}
          className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80 disabled:opacity-50"
        >
          {isPending ? '저장 중...' : uploading ? '사진 올리는 중...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-field border border-line py-3.5 text-sm font-bold text-ink-soft"
          >
            취소
          </button>
        )}
      </div>
    </form>
  )
}
