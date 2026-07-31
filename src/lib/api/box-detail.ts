import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { BoxWithParticipants } from '@/lib/api/boxes'

type OptionRow = Database['public']['Tables']['options']['Row']

// 상자 상세 데이터 로더 — 웹(서버 클라이언트)·토스(브라우저 클라이언트)가 같은 함수를 호출한다.
// 가드(없음/권한없음)는 결과 status로 반환해 각 셸(웹 notFound/redirect, 토스 홈이동)이 처리한다.
export type BoxDetailData =
  | { status: 'ok'; box: BoxWithParticipants; options: OptionRow[]; isFavorite: boolean }
  | { status: 'not_found' }
  | { status: 'forbidden' }

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
  if (!box.box_participants.find(p => p.user_id === userId)) return { status: 'forbidden' }

  const [{ data: favorite }] = await Promise.all([
    supabase.from('favorites').select('box_id').eq('user_id', userId).eq('box_id', boxId).maybeSingle(),
    supabase
      .from('box_participants')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('box_id', boxId)
      .eq('user_id', userId),
  ])

  return { status: 'ok', box, options: optionsData ?? [], isFavorite: !!favorite }
}
