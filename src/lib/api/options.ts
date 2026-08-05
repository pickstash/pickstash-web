import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import type { OptionBlock } from '@/lib/domain/option-content'
import { sendPush } from '@/lib/api/push'

export type Option = Database['public']['Tables']['options']['Row']
/** 선택지 + 파생 카운트(댓글 수). comment_count는 목록 조회에서만 채워진다(optional). */
export type OptionWithCounts = Option & { comment_count?: number }
export type { OptionBlock } from '@/lib/domain/option-content'

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

export async function getOptions(boxId: string): Promise<OptionWithCounts[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('options')
    .select('*, comments(count)')
    .eq('box_id', boxId)
    .order('created_at', { ascending: true })
  if (error) throw error
  const rows = (data ?? []) as unknown as (Option & { comments: { count: number }[] })[]
  return rows.map(({ comments, ...o }) => ({ ...o, comment_count: comments?.[0]?.count ?? 0 }))
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

  // 다른 참여자에게 푸시
  sendPush({ box_id: input.box_id, triggered_by: user.id, message_key: 'option' })

  return data
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
