import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Option = Database['public']['Tables']['options']['Row']
export type SummaryItem = { text: string; order: number }

export interface CreateOptionInput {
  box_id: string
  name: string
  summary?: SummaryItem[]
  memo?: string
}

export interface UpdateOptionInput {
  name?: string
  summary?: SummaryItem[]
  memo?: string
  links?: string[]
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
      summary: (input.summary ?? []) as unknown as Database['public']['Tables']['options']['Insert']['summary'],
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error

  // 상자 updated_at 갱신
  await supabase.from('boxes').update({ updated_at: new Date().toISOString() }).eq('id', input.box_id)

  return data
}

export async function updateOption(id: string, input: UpdateOptionInput): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('options')
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.summary !== undefined && { summary: input.summary as unknown as Database['public']['Tables']['options']['Update']['summary'] }),
      ...(input.memo !== undefined && { memo: input.memo }),
      ...(input.links !== undefined && { links: input.links as unknown as Database['public']['Tables']['options']['Update']['links'] }),
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteOption(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('options').delete().eq('id', id)
  if (error) throw error
}
