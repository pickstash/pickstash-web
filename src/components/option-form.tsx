'use client'

import { useRef, useState } from 'react'
import { uploadOptionImage } from '@/lib/api/options'
import { fetchLinkPreview, proxiedImageUrl } from '@/lib/api/unfurl'
import { readClipboardText } from '@/lib/clipboard/native-clipboard'
import {
  cleanBlocks,
  linkBlocksOf,
  linkHref,
  linkKindEmoji,
  linkKindLabel,
  linkKindOf,
  splitPastedLink,
  type OptionBlock,
} from '@/lib/domain/option-content'

interface OptionFormProps {
  boxId: string
  initialName?: string
  initialContent?: OptionBlock[]
  isPending?: boolean
  onSubmit: (data: { name: string; content: OptionBlock[] }) => void
  onCancel?: () => void
  submitLabel?: string
  /** 상단에 '📋 복사한 링크 넣기' 칩 노출(선택지 추가 화면용). 탭하면 클립보드를 읽어 링크를 담는다. */
  offerClipboardLink?: boolean
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
  offerClipboardLink = false,
}: OptionFormProps) {
  const [name, setName] = useState(initialName)
  const [blocks, setBlocks] = useState<OptionBlock[]>(initialContent)
  const [uploading, setUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [linkLoading, setLinkLoading] = useState<Record<string, boolean>>({})
  // 클립보드 붙여넣기 미리보기 — 읽은 내용을 먼저 보여주고(어떤 링크/텍스트인지) 확인 후 담는다.
  const [clipboardPreview, setClipboardPreview] = useState<
    | { kind: 'link'; url: string; label: string }
    | { kind: 'text'; text: string }
    | { kind: 'error'; msg: string }
    | null
  >(null)
  const [clipboardUsed, setClipboardUsed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 비동기(OG 로드) 후 최신 상태를 읽기 위한 ref
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks
  const nameRef = useRef(name)
  nameRef.current = name

  const imageCount = blocks.filter(b => b.type === 'image').length
  const atBlockLimit = blocks.length >= MAX_BLOCKS

  // 링크는 추가됐지만(URL 있음) OG 미리보기(제목)를 못 가져와 이름이 비어있는 상태.
  // 쿠팡·피그마처럼 봇 미리보기를 막는 사이트 → 이름 자동채움이 안 되므로 직접 입력하라고 안내.
  const urlLinks = linkBlocksOf(blocks).filter(b => b.url.trim() !== '')
  const showNoPreviewHint =
    !name.trim() &&
    Object.keys(linkLoading).length === 0 &&
    urlLinks.length > 0 &&
    urlLinks.every(b => !b.title)

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
    if (blockId === firstLinkId) setName(text)
  }

  // URL이 정해진 채로 링크 블록을 추가하고 바로 미리보기·이름 자동채움을 태운다.
  function addLinkWithUrl(url: string) {
    if (atBlockLimit) return
    const id = newId()
    setBlocks(prev => [...prev, { type: 'link', id, url, label: '' }])
    loadLinkPreview(id, url)
  }

  // 클립보드의 링크를 '한 번의 탭'(제스처)으로 읽어 선택지에 담는다.
  // 이름 필드 붙여넣기와 동일 처리 — 섞인 글씨는 이름 후보로, URL은 링크 블록+미리보기로.
  // 1) 읽기 — 클립보드 내용을 미리보기로만 띄운다(아직 안 담음). 뭘 붙일지 먼저 확인시킨다.
  async function peekClipboard() {
    setClipboardPreview(null)
    let text = ''
    try {
      text = await readClipboardText() // 웹=navigator, 토스=네이티브 getClipboardText(주입)
    } catch {
      setClipboardPreview({ kind: 'error', msg: '클립보드를 읽을 수 없어요. 아래 링크 칸에 직접 붙여넣어 주세요.' })
      return
    }
    const t = text.trim()
    if (!t) {
      setClipboardPreview({ kind: 'error', msg: '클립보드가 비어 있어요.' })
      return
    }
    const split = splitPastedLink(t)
    if (split) setClipboardPreview({ kind: 'link', url: split.url, label: split.label })
    else setClipboardPreview({ kind: 'text', text: t }) // 링크로 안 잡힘 → 원문을 보여주고 이름으로 넣을지 물음
  }

  // 2) 확인 — 미리보기의 링크를 실제로 담는다.
  function confirmClipboardLink() {
    if (clipboardPreview?.kind !== 'link') return
    if (clipboardPreview.label && !name.trim()) setName(clipboardPreview.label)
    addLinkWithUrl(clipboardPreview.url)
    setClipboardUsed(true)
    setClipboardPreview(null)
  }

  // 링크가 아닌 텍스트였을 때 — 선택지 '이름'으로 넣기(붙여넣을 게 링크가 아니었던 경우 구제).
  function useClipboardAsName() {
    if (clipboardPreview?.kind !== 'text') return
    if (!name.trim()) setName(clipboardPreview.text.slice(0, 60))
    setClipboardUsed(true)
    setClipboardPreview(null)
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
    // 지도 링크는 OG 제목이 'Google Maps'·'네이버 지도' 같은 서비스명이라 선택지명으로 부적절 → 자동입력 제외(장소명은 직접).
    if (preview.title && linkKindOf({ url }) !== 'map') {
      const firstLinkId = blocksRef.current.find(b => b.type === 'link')?.id
      if (id === firstLinkId && !nameRef.current.trim()) setName(preview.title)
    }
    setLinkLoading(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  async function addImageFiles(files: File[]) {
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

  function handleAddImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    addImageFiles(files)
  }

  // 클립보드에 복사된 이미지(스크린샷 등) 붙여넣기 — 캡처 단계라 어느 필드에 포커스가 있어도 잡힌다.
  function handlePasteImage(e: React.ClipboardEvent) {
    const imageFiles = Array.from(e.clipboardData?.items ?? [])
      .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((f): f is File => f !== null)
    if (imageFiles.length === 0) return
    e.preventDefault()
    addImageFiles(imageFiles)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), content: cleanBlocks(blocks) })
  }

  return (
    <form onSubmit={handleSubmit} onPasteCapture={handlePasteImage} className="space-y-5 pb-32">
      {/* 복사한 링크 넣기 — 탭(제스처) 안에서 클립보드를 읽어 링크 자동 담기 */}
      {offerClipboardLink && !clipboardUsed && (
        <div>
          {clipboardPreview === null ? (
            // 읽기 전 — 탭하면 클립보드를 읽어 아래에 미리보기를 띄운다(바로 안 담음).
            <button
              type="button"
              onClick={peekClipboard}
              className="flex w-full items-center gap-2 rounded-field border-[1.5px] border-dashed border-butter-dark bg-butter-tint/50 px-4 py-3 text-left text-[13px] font-bold text-ink active:bg-butter-tint"
            >
              <span aria-hidden className="text-base">📋</span>
              <span className="flex-1">복사한 링크 넣기</span>
              <span className="text-[11px] font-semibold text-ink-soft">클립보드에서</span>
            </button>
          ) : clipboardPreview.kind === 'link' ? (
            // 링크 발견 — 무엇을 넣을지 보여주고 확인받는다.
            <div className="rounded-field border-[1.5px] border-butter-dark bg-butter-tint/40 p-3">
              <p className="text-[11.5px] font-bold text-ink-soft">이 링크를 넣을까요?</p>
              {clipboardPreview.label && (
                <p className="mt-1 truncate text-[13px] font-bold text-ink">{clipboardPreview.label}</p>
              )}
              <p className={`truncate text-[12px] text-ink-soft ${clipboardPreview.label ? '' : 'mt-1'}`}>
                {clipboardPreview.url}
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={confirmClipboardLink}
                  className="flex-1 rounded-field bg-ink py-2.5 text-[13px] font-bold text-cream active:opacity-80"
                >
                  링크 넣기
                </button>
                <button
                  type="button"
                  onClick={() => setClipboardPreview(null)}
                  className="rounded-field border border-line bg-paper px-4 py-2.5 text-[13px] font-bold text-ink-soft active:bg-cream"
                >
                  취소
                </button>
              </div>
            </div>
          ) : clipboardPreview.kind === 'text' ? (
            // 링크로 못 잡음 — 복사한 원문을 보여주고 '이름으로 넣기'로 구제.
            <div className="rounded-field border-[1.5px] border-line bg-paper p-3">
              <p className="text-[11.5px] font-bold text-tangerine">링크를 못 찾았어요. 복사한 내용:</p>
              <p className="mt-1 line-clamp-2 break-all text-[12.5px] text-ink">{clipboardPreview.text}</p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={useClipboardAsName}
                  className="flex-1 rounded-field bg-ink py-2.5 text-[13px] font-bold text-cream active:opacity-80"
                >
                  이름으로 넣기
                </button>
                <button
                  type="button"
                  onClick={() => setClipboardPreview(null)}
                  className="rounded-field border border-line bg-paper px-4 py-2.5 text-[13px] font-bold text-ink-soft active:bg-cream"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            // 읽기 실패/빈 클립보드
            <div className="rounded-field border-[1.5px] border-line bg-paper p-3">
              <p className="text-[12px] leading-relaxed text-tangerine">{clipboardPreview.msg}</p>
              <button
                type="button"
                onClick={() => setClipboardPreview(null)}
                className="mt-2 text-[12px] font-bold text-ink-soft underline underline-offset-2"
              >
                닫기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 이름 */}
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
          선택지 이름 <span className="text-tomato">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={name}
            onChange={e => {
              const value = e.target.value
              // "네이버 https://..." 처럼 글씨+링크가 섞여 붙여넣어지면 이름/링크로 자동 분리.
              // onPaste는 토스 웹뷰에서 안 뜨는 경우가 있어, 값 변화에서 '붙여넣기'만 감지한다
              // (inputType 또는 한 번에 여러 글자 급증). 타이핑(한 글자씩)엔 오작동 안 함.
              const isPaste =
                (e.nativeEvent as InputEvent).inputType === 'insertFromPaste' ||
                value.length - name.length > 3
              if (isPaste) {
                const split = splitPastedLink(value)
                if (split) {
                  if (split.label && !name.trim()) setName(split.label)
                  addLinkWithUrl(split.url)
                  return
                }
              }
              setName(value)
            }}
            placeholder="링크 붙여넣기 또는 이름 입력"
            className="w-full rounded-field border-[1.5px] border-line bg-paper px-4 py-3 pr-10 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none focus:ring-[3px] focus:ring-butter-tint"
            required
          />
          {name && (
            <button
              type="button"
              onClick={() => setName('')}
              aria-label="이름 지우기"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint active:bg-cream"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        {showNoPreviewHint && (
          <p className="mt-1.5 flex items-start gap-1 text-[11.5px] leading-relaxed text-tangerine">
            <span aria-hidden>💡</span>
            <span>이 링크는 미리보기를 막아둔 사이트라 이름을 자동으로 못 가져왔어요.<br />선택지 이름을 직접 적어주세요.</span>
          </p>
        )}
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
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-ink-faint">
                    {block.type === 'text' ? '글' : block.type === 'image' ? '사진' : '링크'}
                    {block.type === 'link' && block.url.trim() && (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-line bg-cream px-1.5 py-0.5 text-[10.5px] text-ink-soft">
                        {linkKindEmoji(linkKindOf(block))} {linkKindLabel(linkKindOf(block))}
                      </span>
                    )}
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
                    className="h-auto w-full rounded-[12px] border border-line"
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
                          <img src={proxiedImageUrl(block.image)} alt="" className="h-12 w-12 shrink-0 rounded-[8px] border border-line object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-bold text-ink">{block.title}</p>
                          {block.description && (
                            <p className="line-clamp-1 text-[11px] text-ink-soft">{block.description}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {/* 메모 */}
                    <div className="relative">
                      <input
                        type="text"
                        value={block.label}
                        onChange={e => updateBlock(block.id, { label: e.target.value })}
                        placeholder="메모 (예: 최저가·후기 좋음)"
                        className="w-full rounded-field border-[1.5px] border-line bg-paper px-3.5 py-2.5 pr-9 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
                      />
                      {block.label && (
                        <button
                          type="button"
                          onClick={() => updateBlock(block.id, { label: '' })}
                          aria-label="메모 지우기"
                          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint active:bg-cream"
                        >
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
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
        <p className="mt-1.5 text-[11px] text-ink-faint">이미지를 복사했다면 붙여넣기로도 추가할 수 있어요.</p>
        {imageError && <p className="mt-1.5 text-xs text-tomato">{imageError}</p>}
      </div>

      {/* 버튼 — 하단 고정(fixed) 2단 (취소 · 저장). 모바일=화면 하단 풀폭, PC=폰 프레임 하단에 430px 정렬 */}
      <div className="fixed inset-x-0 bottom-[var(--app-nav-h,0px)] z-20 grid grid-cols-2 gap-2.5 bg-cream px-5 pt-3 pb-[calc(var(--app-cta-safe,env(safe-area-inset-bottom))+0.75rem)] xl:inset-x-auto xl:bottom-10 xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2 xl:rounded-b-[30px]">
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
