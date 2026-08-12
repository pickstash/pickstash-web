import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { BoxWithParticipants } from '@/lib/api/boxes'

type OptionRow = Database['public']['Tables']['options']['Row']

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | null

// 상자 상세 데이터 로더 — 웹(서버 클라이언트)·토스(브라우저 클라이언트)가 같은 함수를 호출한다.
// 가드(없음)는 결과 status로 반환해 각 셸(웹 notFound, 토스 홈이동)이 처리한다.
// 048/049: boxes RLS가 참여자뿐 아니라 '서랍으로 공유된 상자'·'공개 상자'(비로그인 포함)도 읽기 허용 —
//   그런 경우 isParticipant=false로 내려가 셸이 읽기 전용으로 렌더한다.
// userId=null이면 비로그인 열람(공개 상자·초대링크 등) — bookmark/last_seen 등 본인 스코프 조회는 스킵.
export type BoxDetailData =
  | {
      status: 'ok'
      box: BoxWithParticipants
      options: OptionRow[]
      isFavorite: boolean
      isParticipant: boolean
      /** 049: 서랍 접근으로 볼 수 있으면 true — '함께하기'(즉시 참여) 버튼용. false면 공개상자 열람이라 승인제(신청)만 가능. */
      canInstantJoin: boolean
      /** 049: 비참여자가 이미 참여 신청을 넣었는지(공개 상자 승인제, 041) */
      joinRequestStatus: JoinRequestStatus
    }
  | { status: 'not_found' }

export async function loadBoxDetail(
  supabase: SupabaseClient<Database>,
  boxId: string,
  userId: string | null,
): Promise<BoxDetailData> {
  // 마감 투표 자동 결정(lazy commit) — 마감 지난 auto_deadline면 확정, 아니면 no-op. 조회 전에 호출.
  await supabase.rpc('auto_decide_box', { p_box_id: boxId })

  const [{ data, error }, { data: optionsData }] = await Promise.all([
    supabase
      .from('boxes')
      .select(`*, box_participants(user_id, joined_at, last_seen_at, profiles(id, nickname, avatar_url))`)
      .eq('id', boxId)
      .single(),
    supabase.from('options').select('*').eq('box_id', boxId).order('created_at', { ascending: true }),
  ])

  if (error || !data) return { status: 'not_found' }
  const box = data as unknown as BoxWithParticipants
  const isParticipant = !!userId && !!box.box_participants.find(p => p.user_id === userId)

  if (!userId) {
    return { status: 'ok', box, options: optionsData ?? [], isFavorite: false, isParticipant: false, canInstantJoin: false, joinRequestStatus: null }
  }

  const favoritePromise = supabase.from('bookmarks').select('box_id').eq('user_id', userId).eq('box_id', boxId).maybeSingle()
  let canInstantJoin = false
  let joinRequestStatus: JoinRequestStatus = null

  if (isParticipant) {
    const [{ data: favorite }] = await Promise.all([
      favoritePromise,
      supabase.from('box_participants').update({ last_seen_at: new Date().toISOString() }).eq('box_id', boxId).eq('user_id', userId),
    ])
    return { status: 'ok', box, options: optionsData ?? [], isFavorite: !!favorite, isParticipant, canInstantJoin, joinRequestStatus }
  }

  // 049: 비참여자 — '함께하기'(즉시)와 '함께하기 신청'(승인제)을 구분해야 해서 둘 다 조회.
  const [{ data: favorite }, { data: instant }, { data: reqRow }] = await Promise.all([
    favoritePromise,
    // types.ts 미갱신 RPC(049) — 저장소 관례대로 캐스팅.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)('can_join_box_instantly', { p_box_id: boxId }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('join_requests' as any) as any).select('status').eq('box_id', boxId).eq('user_id', userId).maybeSingle(),
  ])
  canInstantJoin = !!instant
  joinRequestStatus = (reqRow as { status: JoinRequestStatus } | null)?.status ?? null

  return { status: 'ok', box, options: optionsData ?? [], isFavorite: !!favorite, isParticipant, canInstantJoin, joinRequestStatus }
}
