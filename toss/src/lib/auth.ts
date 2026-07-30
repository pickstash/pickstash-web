import { appLogin } from "@apps-in-toss/web-framework";
import { supabase } from "./supabase";

// 토스 로그인 → Supabase 세션.
// appLogin으로 authCode를 받아 백엔드(/api/toss/login, mTLS)에 넘기고,
// 백엔드가 발급한 magiclink token_hash를 verifyOtp로 교환해 Supabase 세션을 확보한다.
const LOGIN_ENDPOINT = import.meta.env.VITE_TOSS_LOGIN_ENDPOINT;

export async function loginWithToss() {
  const { authorizationCode, referrer } = await appLogin();

  const res = await fetch(LOGIN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authorizationCode, referrer }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`토스 로그인 백엔드 실패 (${res.status}) ${detail}`);
  }

  const { token_hash } = (await res.json()) as { email: string; token_hash: string };
  const { data, error } = await supabase.auth.verifyOtp({ token_hash, type: "magiclink" });
  if (error) throw error;
  return data.session;
}

export async function logout() {
  await supabase.auth.signOut();
}
