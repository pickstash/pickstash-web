import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { JoinClient } from './join-client'

interface Props {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_box_by_invite_code', { p_code: code })
  const box = data?.[0]

  const title = box?.title ? `${box.title} — 결정창고` : '결정창고 초대'
  return {
    title,
    description: '투표하러 가기',
    openGraph: { title, description: '투표하러 가기', siteName: '결정창고' },
  }
}

export default async function InviteLandingPage({ params }: Props) {
  const { code } = await params
  const supabase = await createClient()

  const [{ data: { user } }, { data: previewData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc('get_box_preview_by_invite_code', { p_code: code }),
  ])

  const preview = previewData?.[0]

  // 이미 참여자면 바로 이동
  if (user && preview) {
    const { data: participant } = await supabase
      .from('box_participants')
      .select('user_id')
      .eq('box_id', preview.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (participant) redirect(`/box/${preview.id}`)
  }

  if (!preview) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="text-base text-ink-soft">유효하지 않은 초대 링크예요.</p>
      </main>
    )
  }

  const optionNames = (preview.option_names ?? []).filter(Boolean)

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="mx-auto flex w-full max-w-[360px] flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Image src="/icons/icon-192.png" alt="" width={56} height={56} className="rounded-[18px]" />
          <p className="text-[12px] font-semibold text-ink-faint">
            {preview.owner_nickname}님이 함께 정하자고 초대했어요
          </p>
        </div>

        {/* 로그인 전 미리보기 — 무엇을 정하는 상자인지 보여준다 (S2 마찰 제로) */}
        <div className="space-y-3 rounded-card border border-[#ECEADC] bg-paper p-5 shadow-[0_2px_10px_rgba(42,42,39,0.05)]">
          <h1 className="text-[19px] font-extrabold leading-snug tracking-tight text-ink">{preview.title}</h1>
          {preview.memo && (
            <p className="rounded-[14px] border border-dashed border-[#D9D6C2] px-3 py-2.5 text-[12.5px] text-ink-soft">
              ✏️ {preview.memo}
            </p>
          )}
          {optionNames.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11.5px] font-bold text-ink-faint">선택지 {optionNames.length}개</p>
              <div className="flex flex-wrap gap-1.5">
                {optionNames.map((name, i) => (
                  <span key={i} className="rounded-full bg-butter-tint px-2.5 py-1 text-[12px] font-semibold text-ink">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-[11.5px] text-ink-faint">{preview.participant_count}명 참여 중</p>
        </div>

        <JoinClient code={code} isLoggedIn={!!user} />
      </div>
    </main>
  )
}
