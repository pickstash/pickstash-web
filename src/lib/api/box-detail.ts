import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { BoxWithParticipants } from '@/lib/api/boxes'

type OptionRow = Database['public']['Tables']['options']['Row']

// 상자 상세 데이터 로더 — 웹(서버 클라이언트)·토스(브라우저 클라이언트)가 같은 함수를 호출한다.
// 가드(없음)는 결과 status로 반환해 각 셸(웹 notFound, 토스 홈이동)이 처리한다.
// 048: boxes RLS가 참여자뿐 아니라 '내가 멤버인 서랍에 공유된 상자'도 읽기 허용 — 그런 경우
//   isParticipant=false로 내려가 셸이 읽기 전용으로 렌더한다(편집하려면 join_box로 참여해야 함).
export type BoxDetailData =
  | { status: 'ok'; box: BoxWithParticipants; options: OptionRow[]; isFavorite: boolean; isParticipant: boolean }
  | { status: 'not_found' }

export async function loadBoxDetail(
  supabase: SupabaseClient<Database>,
  boxId: string,
  userId: string,
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
  const isParticipant = !!box.box_participants.find(p => p.user_id === userId)

  const favoritePromise = supabase.from('bookmarks').select('box_id').eq('user_id', userId).eq('box_id', boxId).maybeSingle()
  const [{ data: favorite }] = await Promise.all(
    isParticipant
      ? [favoritePromise, supabase.from('box_participants').update({ last_seen_at: new Date().toISOString() }).eq('box_id', boxId).eq('user_id', userId)]
      : [favoritePromise],
  )

  return { status: 'ok', box, options: optionsData ?? [], isFavorite: !!favorite, isParticipant }
}
