import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

interface RequestBody {
  box_id: string
  triggered_by: string
  // 특정 사용자에게만 보낼 때(예: 댓글 @멘션). 없으면 상자 참여자 전체 브로드캐스트.
  target_user_ids?: string[]
  message_key?: 'mention'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })

  const { box_id, triggered_by, target_user_ids, message_key }: RequestBody = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 상자 제목 조회
  const { data: box } = await supabase
    .from('boxes')
    .select('title')
    .eq('id', box_id)
    .single()

  if (!box) return new Response('Box not found', { status: 404, headers: corsHeaders })

  let userIds: string[]
  if (target_user_ids?.length) {
    // 타겟 발송(예: 멘션) — 전체 참여자 조회를 건너뛰고 지정된 대상만
    userIds = target_user_ids.filter(id => id !== triggered_by)
  } else {
    // 나를 제외한 참여자 전체 브로드캐스트 (기존 동작)
    const { data: participants } = await supabase
      .from('box_participants')
      .select('user_id')
      .eq('box_id', box_id)
      .neq('user_id', triggered_by)

    userIds = (participants ?? []).map(p => p.user_id)
  }

  if (!userIds.length) return new Response('OK', { headers: corsHeaders })

  // 참여자들의 push 구독 정보 조회
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (!subscriptions?.length) return new Response('OK', { headers: corsHeaders })

  webpush.setVapidDetails(
    'mailto:admin@pickstash.app',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  let bodyText = `${box.title}에 새로운 소식이 있어요!`
  if (message_key === 'mention') {
    const { data: actor } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', triggered_by)
      .single()
    bodyText = `${actor?.nickname ?? '누군가'}님이 댓글에서 회원님을 언급했어요`
  }

  const payload = JSON.stringify({
    title: '결정창고',
    body: bodyText,
    url: `/box/${box_id}`,
  })

  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
    )
  )

  // 만료된 구독(410) 정리
  const expiredEndpoints: string[] = []
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const err = result.reason as { statusCode?: number }
      if (err?.statusCode === 410) expiredEndpoints.push(subscriptions[i].endpoint)
    }
  })
  if (expiredEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
  }

  return new Response('OK', { headers: corsHeaders })
})
