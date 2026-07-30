import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// 웹의 `@/lib/supabase/client`(@supabase/ssr, process.env) 대체.
// vite.config에서 `@/lib/supabase/client` → 이 파일로 alias한다.
// 공유 api 레이어(src/lib/api/*)가 createClient()를 호출하므로 동일 시그니처를 제공한다.
// 세션은 localStorage 기반(supabase-js 기본) — 토스 로그인(verifyOtp)이 저장한 세션을 그대로 공유.
let client: SupabaseClient<Database> | null = null;

export function createClient(): SupabaseClient<Database> {
  return (client ??= createSupabaseClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  ));
}
