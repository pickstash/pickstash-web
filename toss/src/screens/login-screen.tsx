import { useState } from "react";
import { Button } from "@toss/tds-mobile";
import { loginWithToss } from "../lib/auth";

// 토스 로그인 인트로 — 출시 가이드: 서비스 설명 + 약관 고지 노출.
export function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      await loginWithToss();
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인에 실패했어요");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col justify-between bg-cream px-6 pb-10 pt-[calc(env(safe-area-inset-top)+3rem)]">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <img src="/icons/character.png" alt="" className="h-16 w-auto" />
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">결정창고</h1>
        <p className="text-[15px] leading-relaxed text-ink-soft">
          흩어진 링크와 의견을 모아
          <br />
          투표로 결정하고 기록해요
        </p>
      </div>

      <div className="space-y-3">
        <Button onClick={() => void handleLogin()} loading={loading} display="block">
          토스로 시작하기
        </Button>
        {error && <p className="break-all text-center text-[13px] text-tomato">{error}</p>}
        <p className="text-center text-[11px] leading-relaxed text-ink-faint">
          시작하면 서비스 이용약관 및 개인정보처리방침에 동의하게 돼요
        </p>
      </div>
    </main>
  );
}
