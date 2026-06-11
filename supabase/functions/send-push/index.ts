import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

interface RequestBody {
  box_id: string
  triggered_by: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const { box_id, triggered_by }: RequestBody = await req.json()

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

  if (!box) return new Response('Box not found', { status: 404 })

  // 나를 제외한 참여자 목록
  const { data: participants } = await supabase
    .from('box_participants')
    .select('user_id')
    .eq('box_id', box_id)
    .neq('user_id', triggered_by)

  if (!participants?.length) return new Response('OK')

  const userIds = participants.map(p => p.user_id)

  // 참여자들의 push 구독 정보 조회
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (!subscriptions?.length) return new Response('OK')

  webpush.setVapidDetails(
    'mailto:admin@pickstash.app',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const payload = JSON.stringify({
    title: '결정창고',
    body: `${box.title}에 새로운 소식이 있어요!`,
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

  return new Response('OK')
})
