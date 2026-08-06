import { createClient } from '@/lib/supabase/client'

type MessageKey = 'comment' | 'option' | 'decision' | 'decision_auto' | 'mention' | 'join'

interface SendPushBody {
  box_id?: string
  folder_id?: string
  option_id?: string
  triggered_by: string
  target_user_ids?: string[]
  message_key: MessageKey
}

/** send-push 엣지 함수 호출 — fire-and-forget이지만 실패는 콘솔에 남긴다(완전 무음이면 진단 불가). */
export function sendPush(body: SendPushBody): void {
  const supabase = createClient()
  console.log('[push] invoking send-push', body.message_key)
  supabase.functions
    .invoke('send-push', { body })
    .then(({ error }) => {
      if (error) console.error('[push] send-push invoke failed', body.message_key, error)
      else console.log('[push] send-push invoke ok', body.message_key)
    })
    .catch(e => console.error('[push] send-push invoke threw', body.message_key, e))
}
