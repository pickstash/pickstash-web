/// <reference types="vite/client" />

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_TOSS_LOGIN_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
