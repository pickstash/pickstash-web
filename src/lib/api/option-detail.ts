import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { getBoxStatus } from '@/lib/domain/box-status'

type OptionRow = Database['public']['Tables']['options']['Row']
type Participant = { id: string; nickname: string; avatar_url: string | null }

// 선택지 상세 데이터 로더 — 웹·토스 공유. 가드는 status로 반환.
// 048/049: boxes/options RLS가 참여자 아니어도 서랍 접근·공개 상자(비로그인 포함)면 읽기 허용 →
//   isParticipant=false로 내려가 셸이 댓글 작성·편집 UI를 숨긴 읽기 전용으로 렌더한다.
export type OptionDetailData =
  | {
      status: 'ok'
      option: OptionRow
      creator: { nickname: string; avatar_url: string | null } | null
      round: number
      canVote: boolean
      checklist: boolean
      checkable: boolean
      myNickname: string
      participants: Participant[]
      isParticipant: boolean
    }
  | { status: 'not_found' }

export async function loadOptionDetail(
  supabase: SupabaseClient<Database>,
  boxId: string,
  optionId: string,
  userId: string | null,
): Promise<OptionDetailData> {
  const [{ data: option }, { data: boxData }, { data: me }] = await Promise.all([
    supabase.from('options').select('*').eq('id', optionId).single(),
    supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(id, nickname, avatar_url))')
      .eq('id', boxId)
      .single(),
    userId ? supabase.from('profiles').select('nickname').eq('id', userId).single() : Promise.resolve({ data: null }),
  ])

  if (!option || !boxData) return { status: 'not_found' }

  const box = boxData as typeof boxData & {
    box_participants: { user_id: string; profiles: Participant | null }[]
  }
  const isParticipant = !!userId && !!box.box_participants.find(p => p.user_id === userId)

  const participants = box.box_participants
    .filter(p => p.profiles)
    .map(p => ({ id: p.profiles!.id, nickname: p.profiles!.nickname, avatar_url: p.profiles!.avatar_url }))

  // 선택지 생성자 프로필 (상단 히어로 메타). 탈퇴한 유저의 선택지는 created_by=null(025) → 생성자 없음.
  const { data: creator } = option.created_by
    ? await supabase
        .from('profiles')
        .select('nickname, avatar_url')
        .eq('id', option.created_by)
        .single()
    : { data: null }

  return {
    status: 'ok',
    option,
    creator,
    round: box.current_round,
    canVote: isParticipant && getBoxStatus(box) === 'OPEN',
    checklist: box.mode === 'checklist',
    checkable: box.mode === 'checklist' && ((box as unknown as { checkable?: boolean }).checkable ?? false),
    myNickname: me?.nickname ?? '',
    participants,
    isParticipant,
  }
}
