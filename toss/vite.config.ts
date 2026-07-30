import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 웹(Next)과 공유하는 코어(domain·api·hooks) 재사용: 웹 src를 '@'로 참조.
      // 코어는 프레임워크 독립적이라 Vite에서 그대로 동작한다.
      "@": fileURLToPath(new URL("../src", import.meta.url)),
    },
  },
  server: {
    // 토스 앱 루트(toss/) 밖의 공유 파일(../src)을 dev에서 읽을 수 있게 허용
    fs: { allow: [".."] },
  },
});
