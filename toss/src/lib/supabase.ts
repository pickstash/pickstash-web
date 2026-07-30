import { createClient } from "@supabase/supabase-js";

// 토스 미니앱용 Supabase 클라이언트 (Vite env + publishable key).
// 웹(Next)은 별도 클라이언트(@supabase/ssr, process.env)를 쓰지만,
// 같은 Supabase 프로젝트를 웹·토스가 공유한다.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
