import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { splitPastedLink, linkHref, type OptionBlock } from '@/lib/domain/option-content'
import { fetchLinkPreview, type LinkPreview } from '@/lib/api/unfurl'

export type Option = Database['public']['Tables']['options']['Row']
export type { OptionBlock } from '@/lib/domain/option-content'

const QUICK_ADD_MAX = 10

function newBlockId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

function domainOf(url: string): string {
  try {
    return new URL(linkHref(url)).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** 붙여넣은 텍스트에서 URL을 감지한 개수 (빠른 추가 미리보기용, 최대 QUICK_ADD_MAX). */
export function countQuickAddLinks(text: string): number {
  const n = text
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean)
    .filter(l => splitPastedLink(l))
    .length
  return Math.min(n, QUICK_ADD_MAX)
}

export interface CreateOptionInput {
  box_id: string
  name: string
  content?: OptionBlock[]
}

export interface UpdateOptionInput {
  name?: string
  content?: OptionBlock[]
}

/** 선택지 이미지 업로드 → 공개 URL 반환 (option-images 버킷) */
export async function uploadOptionImage(boxId: string, file: File): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const rand = Math.random().toString(36).slice(2, 10)
  const path = `${boxId}/${user.id}/${Date.now()}-${rand}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('option-images')
    .upload(path, file, { upsert: false, contentType: file.type })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from('option-images').getPublicUrl(path)
  return publicUrl
}

export async function getOptions(boxId: string): Promise<Option[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('options')
    .select('*')
    .eq('box_id', boxId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getOption(id: string): Promise<Option | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('options')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createOption(input: CreateOptionInput): Promise<Option> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('options')
    .insert({
      box_id: input.box_id,
      name: input.name,
      content: (input.content ?? []) as unknown as Database['public']['Tables']['options']['Insert']['content'],
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error

  // 활동 기록·updated_at 갱신은 DB 트리거가 수행 (004_replan.sql).
  // 내 활동으로 내 목록에 NEW가 뜨지 않게 본인 last_seen_at만 당겨둔다.
  await supabase
    .from('box_participants')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('box_id', input.box_id)
    .eq('user_id', user.id)

  // 다른 참여자에게 푸시 (실패 무시)
  supabase.functions.invoke('send-push', {
    body: { box_id: input.box_id, triggered_by: user.id },
  }).catch(() => {})

  return data
}

/**
 * 링크 붙여넣기 → 선택지 자동 생성 (쇼핑 등 링크 위주 상자용).
 * 각 줄에서 URL을 추출해, OG 제목을 선택지 이름으로 하는 선택지를 한 번에 만든다.
 * 이름은 OG 제목 → 붙여넣은 라벨 → 도메인 순. 최대 QUICK_ADD_MAX개.
 */
export async function createOptionsFromText(boxId: string, text: string): Promise<{ created: number }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const items = text
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => splitPastedLink(l))
    .filter((x): x is { url: string; label: string } => !!x)
    .slice(0, QUICK_ADD_MAX)
  if (items.length === 0) return { created: 0 }

  // OG 미리보기 병렬 조회 (실패해도 폴백)
  const previews = await Promise.all(
    items.map(it => fetchLinkPreview(it.url).catch((): LinkPreview => ({ url: it.url }))),
  )

  const rows = items.map((it, i) => {
    const p = previews[i]
    const name = (p.title || it.label || domainOf(it.url)).slice(0, 50)
    const content: OptionBlock[] = [
      {
        type: 'link',
        id: newBlockId(),
        url: it.url,
        label: it.label,
        title: p.title,
        description: p.description,
        image: p.image,
      },
    ]
    return {
      box_id: boxId,
      name,
      content: content as unknown as Database['public']['Tables']['options']['Insert']['content'],
      created_by: user.id,
    }
  })

  // 한 번에 insert (트리거가 활동로그·updated_at 처리). 순서 보존 위해 rows 순서 유지.
  const { data, error } = await supabase.from('options').insert(rows).select('id')
  if (error) throw error

  // 본인 last_seen 갱신(내 목록 NEW 방지) + 참여자 푸시 1회
  await supabase
    .from('box_participants')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('box_id', boxId)
    .eq('user_id', user.id)
  supabase.functions.invoke('send-push', { body: { box_id: boxId, triggered_by: user.id } }).catch(() => {})

  return { created: data?.length ?? 0 }
}

export async function updateOption(id: string, input: UpdateOptionInput): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('options')
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.content !== undefined && { content: input.content as unknown as Database['public']['Tables']['options']['Update']['content'] }),
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteOption(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('options').delete().eq('id', id)
  if (error) throw error
}
