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
  // 홈은 루트라 뒤로가기 없음. theme:dark = 크림 위 어두운 버튼/상태바 톤.
  navigationBar: {
    withBackButton: false,
    withHomeButton: false,
    withTitle: false,
    transparentBackground: true,
    theme: "dark",
  },
  permissions: [],
  outdir: "dist",
});
