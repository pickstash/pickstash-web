import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 비로그인 접근 허용 랜딩(§6-1 뷰어). /folder-invite도 폴더 공유 뷰어라 반드시 포함(018·019).
// /api/toss/login: 토스 미니앱이 웹 세션 쿠키 없이 호출하는 mTLS 로그인 브릿지 → 반드시 공개.
const PUBLIC_ROUTES = ['/login', '/auth/callback', '/invite', '/group-invite', '/folder-invite', '/api/toss/login']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

  if (!user && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // sw.js·manifest.json 제외 필수: 인증 가드가 이들을 /login으로 리다이렉트하면
    // 서비스워커 등록·매니페스트 로드가 실패해 PWA가 '설치 가능'으로 인식되지 않는다
    // (beforeinstallprompt 미발생 → 설치 버튼 비활성).
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
