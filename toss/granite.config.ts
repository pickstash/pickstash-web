import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "pickstash", // 앱인토스 콘솔에 등록한 appName과 정확히 동일해야 함
  brand: {
    displayName: "결정창고",
    primaryColor: "#FFD84A", // 브랜드 포인트(버터) — 버튼 기본 배경색으로 일괄 적용됨
    icon: "", // 콘솔 업로드 아이콘 URL (추후 설정)
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
