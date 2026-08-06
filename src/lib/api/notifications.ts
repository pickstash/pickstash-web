import { createClient } from '@/lib/supabase/client'

// 유형별 알림 on/off (028 notification_prefs). 행이 없으면 전부 on.
export type NotifType = 'comment' | 'mention' | 'option' | 'decision' | 'join' | 'invite'
export type NotificationPrefs = Record<NotifType, boolean>

export const NOTIF_DEFAULTS: NotificationPrefs = {
  comment: true,
  mention: true,
  option: true,
  decision: true,
  join: true,
  invite: true,
}

// notification_prefs는 생성 타입(types.ts)에 아직 없어 from을 캐스팅해 접근한다(테이블은 028, invite_enabled는 030).
interface PrefRow {
  comment_enabled: boolean
  mention_enabled: boolean
  option_enabled: boolean
  decision_enabled: boolean
  join_enabled: boolean
  invite_enabled: boolean
}

export async function getMyNotificationPrefs(): Promise<NotificationPrefs> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NOTIF_DEFAULTS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from as any)('notification_prefs')
    .select('comment_enabled, mention_enabled, option_enabled, decision_enabled, join_enabled, invite_enabled')
    .eq('user_id', user.id)
    .maybeSingle()
  const row = data as unknown as PrefRow | null
  if (!row) return NOTIF_DEFAULTS
  return {
    comment: row.comment_enabled,
    mention: row.mention_enabled,
    option: row.option_enabled,
    decision: row.decision_enabled,
    join: row.join_enabled,
    invite: row.invite_enabled,
  }
}

export async function setNotificationPref(type: NotifType, enabled: boolean): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  // 행 없으면 insert(나머지 컬럼은 default true), 있으면 해당 컬럼만 update.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from as any)('notification_prefs')
    .upsert({ user_id: user.id, [`${type}_enabled`]: enabled, updated_at: new Date().toISOString() }, {
      onConflict: 'user_id',
    })
}
