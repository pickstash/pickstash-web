import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { getBoxStatus } from '@/lib/domain/box-status'

type OptionRow = Database['public']['Tables']['options']['Row']
type Participant = { id: string; nickname: string; avatar_url: string | null }

// 선택지 상세 데이터 로더 — 웹·토스 공유. 가드는 status로 반환.
export type OptionDetailData =
  | {
      status: 'ok'
      option: OptionRow
      creator: { nickname: string; avatar_url: string | null } | null
      round: number
      canVote: boolean
      myNickname: string
      participants: Participant[]
    }
  | { status: 'not_found' }
  | { status: 'forbidden' }

export async function loadOptionDetail(
  supabase: SupabaseClient<Database>,
  boxId: string,
  optionId: string,
  userId: string,
): Promise<OptionDetailData> {
  const [{ data: option }, { data: boxData }, { data: me }] = await Promise.all([
    supabase.from('options').select('*').eq('id', optionId).single(),
    supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(id, nickname, avatar_url))')
      .eq('id', boxId)
      .single(),
    supabase.from('profiles').select('nickname').eq('id', userId).single(),
  ])

  if (!option || !boxData) return { status: 'not_found' }

  const box = boxData as typeof boxData & {
    box_participants: { user_id: string; profiles: Participant | null }[]
  }
  if (!box.box_participants.find(p => p.user_id === userId)) return { status: 'forbidden' }

  const participants = box.box_participants
    .filter(p => p.profiles)
    .map(p => ({ id: p.profiles!.id, nickname: p.profiles!.nickname, avatar_url: p.profiles!.avatar_url }))

  // 선택지 생성자 프로필 (상단 히어로 메타)
  const { data: creator } = await supabase
    .from('profiles')
    .select('nickname, avatar_url')
    .eq('id', option.created_by)
    .single()

  return {
    status: 'ok',
    option,
    creator,
    round: box.current_round,
    canVote: getBoxStatus(box) === 'OPEN',
    myNickname: me?.nickname ?? '',
    participants,
  }
}
