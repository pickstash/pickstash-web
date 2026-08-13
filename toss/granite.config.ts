import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "pickstash", // 앱인토스 콘솔에 등록한 appName과 정확히 동일해야 함
  brand: {
    displayName: "결정창고",
    primaryColor: "#FFD84A", // 브랜드 포인트(버터) — 버튼 기본 배경색으로 일괄 적용됨
    icon: "https://static.toss.im/appsintoss/65173/44c6c686-93de-4df8-8f18-b96b8d265e9a.png", // 콘솔 업로드 아이콘과 동일 URL
  },
  web: {
    host: "localhost",
    port: 8888,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  // 토스 네이티브 내비게이션 바(흰 바)를 투명화 + 제목/버튼 숨김 → 크림 배경이 비쳐
  // 우리 자체 헤더(캐릭터·이름·햄버거)와 이중 헤더가 되지 않게 한다.
  // 네이티브 내비바 버튼은 전부 숨긴다 — 뒤로가기는 앱 자체 헤더(PageHeader) 버튼이 담당한다.
  //   (withBackButton을 켜면 글로벌이라 탭 화면에도 뜨고 자체 헤더와 겹친다.)
  //   iOS 스와이프는 App.tsx에서 전 화면 OFF(단일 WebView라 스와이프=미니앱 종료). theme:dark = 크림 위 어두운 상태바 톤.
  navigationBar: {
    withBackButton: false,
    withHomeButton: false,
    withTitle: false,
    transparentBackground: true,
    theme: "dark",
  },
  // 클립보드 읽기 권한 — 이 선언이 없으면 getClipboardText가 매 호출마다 권한 다이얼로그를 띄운다.
  permissions: [{ name: "clipboard", access: "read" }],
  outdir: "dist",
});
