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
      <body className="min-h-full bg-background text-foreground antialiased">
        <Providers>
          {/* 모바일 우선 — 큰 화면에서는 430px 중앙 정렬 (spec: 390px 기준 설계) */}
          <div className="mx-auto w-full max-w-[430px] min-h-dvh">{children}</div>
        </Providers>
      </body>
    </html>
  )
}
