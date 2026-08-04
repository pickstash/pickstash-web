/// <reference types="vite/client" />

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_TOSS_LOGIN_ENDPOINT: string;
  // 스마트발송(기능성) 소재의 templateCode — 푸시 알림 동의 요청용. 미설정 시 동의 요청 생략.
  readonly VITE_TOSS_NOTI_TEMPLATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
