import type { NextConfig } from "next";
import withSerwist from "@serwist/next";

const nextConfig: NextConfig = {
  turbopack: {},
  // /favorites → /bookmarks 영구 이전(북마크 개념 일원화). 딥링크·구 URL 호환.
  async redirects() {
    return [{ source: '/favorites', destination: '/bookmarks', permanent: true }];
  },
};

export default withSerwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // dev에선 서비스워커 생성 비활성화 — 매 컴파일마다 public/sw.js를 재생성하면
  // 파일 워처가 이를 감지해 재컴파일이 증폭돼 화면 이동이 느려진다. PWA는 프로덕션에서만 필요.
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
