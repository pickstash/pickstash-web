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
  // 앱인토스 콘솔 > 수익화 > 인앱광고에서 발급받은 배너 광고그룹 ID. 미설정 시 배너 생략.
  readonly VITE_TOSS_AD_BANNER_GROUP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
