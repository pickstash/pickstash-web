// 토스 스마트 발송 푸시 프록시.
// 공유 api 레이어(src/lib/api/*)가 웹·토스 양쪽에서 supabase.functions.invoke('send-push')로
// 호출한다(플랫폼 무관 엔트리). 실제 발송은 mTLS가 검증된 Vercel 라우트(/api/toss/send)가 수행하고,
// 이 함수는 그 라우트로 그대로 넘기는 얇은 프록시다. (엣지 Deno는 mTLS 클라이언트 인증서가 불안정)
//
// 환경변수(supabase secrets):
//   TOSS_NOTIFY_URL     Vercel 발송 라우트 URL (예: https://pickstash-web.vercel.app/api/toss/send)
//   TOSS_NOTIFY_SECRET  라우트와 공유하는 내부 시크릿

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })

  const body = await req.text()
  // 발송은 fire-and-forget — 실패해도 원 mutation은 성공 취급(호출부가 .catch로 무시).
  // 단, 실패 자체는 로그로 남긴다 — 안 그러면 발송이 조용히 죽어도 알 방법이 없다.
  await fetch(Deno.env.get('TOSS_NOTIFY_URL')!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': Deno.env.get('TOSS_NOTIFY_SECRET')!,
    },
    body,
  })
    .then(async res => {
      if (!res.ok) console.error('[send-push] upstream error', res.status, await res.text().catch(() => ''))
    })
    .catch(e => console.error('[send-push] fetch failed', e))

  return new Response('OK', { headers: corsHeaders })
})
