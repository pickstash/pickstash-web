// 토스 미니앱용 Supabase 클라이언트 — 단일 인스턴스를 shim에서 가져온다.
// 공유 api 레이어(src/lib/api/*)도 vite alias를 통해 같은 createClient()를 쓰므로
// App/auth와 api가 동일 인스턴스를 공유한다(세션 일관성).
import { createClient } from "./supabase-client";

export { createClient };
export const supabase = createClient();
