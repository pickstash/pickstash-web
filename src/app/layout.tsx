import type { Metadata, Viewport } from 'next'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './globals.css'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: '결정창고',
  description: '친구들과 함께 의사결정하는 앱',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '결정창고',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover', // env(safe-area-inset-*)이 노치 값을 반환하도록
  themeColor: '#f7f6ea',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="h-full">
      <head>
        {/* React 마운트 전에 beforeinstallprompt를 잡아두기 위한 early capture */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__pwaPrompt = e;
            window.dispatchEvent(new Event('pwa-install-ready'));
          });
        `}} />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased xl:bg-[#e6e4db]">
        <Providers>
          {/* 모바일·태블릿은 가로 100%, PC(xl+)에선 모바일 앱을 중앙 폰 프레임(상하 여백 + 내부 스크롤)으로 */}
          <div className="app-frame mx-auto min-h-dvh w-full bg-cream xl:my-10 xl:h-[calc(100dvh-5rem)] xl:min-h-0 xl:max-w-[430px] xl:overflow-y-auto xl:rounded-[30px] xl:border xl:border-line xl:shadow-[0_20px_60px_rgba(42,42,39,0.16)]">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
