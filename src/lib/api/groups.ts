import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMember = Database['public']['Tables']['group_members']['Row']

export interface GroupWithMembers extends Group {
  group_members: {
    user_id: string
    joined_at: string
    profiles: { id: string; nickname: string; avatar_url: string | null } | null
  }[]
}

export async function getMyGroups(): Promise<GroupWithMembers[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('groups')
    .select(`*, group_members(user_id, joined_at, profiles(id, nickname, avatar_url))`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as GroupWithMembers[]
}

export async function getGroup(id: string): Promise<GroupWithMembers | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('groups')
    .select(`*, group_members(user_id, joined_at, profiles(id, nickname, avatar_url))`)
    .eq('id', id)
    .single()
  if (error) return null
  return data as unknown as GroupWithMembers
}

export async function checkGroupNameExists(name: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase.rpc('check_group_name_exists', { p_name: name })
  return data ?? false
}

export async function createGroup(name: string): Promise<Group> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('groups')
    .insert({ name, owner_id: user.id })
    .select()
    .single()
  if (error) throw error

  await supabase.from('group_members').insert({ group_id: data.id, user_id: user.id })
  return data
}

export async function leaveGroup(groupId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id)
  if (error) throw error
}

export async function getGroupByInviteCode(code: string): Promise<{ id: string; name: string } | null> {
  const supabase = createClient()
  const { data } = await supabase.rpc('get_group_by_invite_code', { p_code: code })
  return data?.[0] ?? null
}

export async function joinGroupByInviteCode(code: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('join_group_by_invite_code', { p_code: code })
  if (error) throw error
  return data as string
}

export async function inviteGroupToBox(boxId: string, groupId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('invite_group_to_box', { p_box_id: boxId, p_group_id: groupId })
  if (error) throw error
}
