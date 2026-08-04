import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // 공유 코드(../src)와 토스 앱이 각자 node_modules의 사본을 쓰면 인스턴스가 중복돼
    // Context가 어긋난다(예: "No QueryClient"). 아래 패키지는 단일 인스턴스로 강제.
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
    // 배열 형태: 더 구체적인 alias를 먼저 둔다(순서대로 매칭).
    alias: [
      // 공유 api 레이어가 부르는 브라우저 supabase 클라이언트를 토스 shim으로 치환.
      // (웹은 @supabase/ssr+process.env, 토스는 supabase-js+VITE env)
      {
        find: "@/lib/supabase/client",
        replacement: fileURLToPath(new URL("./src/lib/supabase-client.ts", import.meta.url)),
      },
      // 공유 뷰어(BoxViewer)가 쓰는 next/image → 토스는 <img> shim으로.
      {
        find: "next/image",
        replacement: fileURLToPath(new URL("./src/shims/next-image.tsx", import.meta.url)),
      },
      // 웹(Next)과 공유하는 코어(domain·api·hooks) 재사용: 웹 src를 '@'로 참조.
      { find: "@", replacement: fileURLToPath(new URL("../src", import.meta.url)) },
    ],
  },
  server: {
    // 브라우저 미리보기 포트. granite의 web.port는 vite에 안 먹어서 여기서 지정.
    port: 8888,
    strictPort: true, // 8888 점유 시 조용히 5174로 안 넘어가고 에러로 알림
    // 토스 앱 루트(toss/) 밖의 공유 파일(../src)을 dev에서 읽을 수 있게 허용
    fs: { allow: [".."] },
  },
});
