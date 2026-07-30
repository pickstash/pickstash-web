import { useEffect, useState } from "react";
import { Top, Button } from "@toss/tds-mobile";
import { getAnonymousKey } from "@apps-in-toss/web-framework";
import type { Session } from "@supabase/supabase-js";
import { BOX_STATUS_LABEL, getBoxStatus } from "@/lib/domain/box-status";
import { supabase } from "./lib/supabase";
import { loginWithToss, logout } from "./lib/auth";
import "./App.css";

function App() {
  // 공유 코어(웹 domain) 재사용 증명 — 순수 함수라 Vite에서 그대로 동작
  const sharedLabel = BOX_STATUS_LABEL[getBoxStatus({ closed_at: null })];

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tossKey, setTossKey] = useState("확인 중…");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // 토스 익명 키 — 토스 앱 런타임에서만 동작 (일반 브라우저/dev에선 미지원 정상)
    getAnonymousKey()
      .then((res) => {
        if (!res) setTossKey("미지원 (토스 앱 밖)");
        else if (res === "ERROR") setTossKey("오류");
        else setTossKey(res.hash);
      })
      .catch(() => setTossKey("토스 앱 밖에서는 호출 불가"));
  }, []);

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
    <>
      <Top
        title={<Top.TitleParagraph size={22}>결정창고 · 토스</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            {session ? "로그인됨" : "토스로 로그인하세요"}
          </Top.SubtitleParagraph>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 24 }}>
        <StatusRow label="공유 코어(도메인) import" value={`OK — 라벨 "${sharedLabel}"`} />
        <StatusRow label="토스 익명 키(getAnonymousKey)" value={tossKey} />

        {session ? (
          <>
            <StatusRow label="Supabase 세션 (auth.uid)" value={session.user.id} />
            <Button variant="weak" onClick={() => void logout()}>
              로그아웃
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => void handleLogin()} loading={loading}>
              토스로 로그인
            </Button>
            {error && <span style={{ color: "#DE5B41", fontSize: 13, wordBreak: "break-all" }}>{error}</span>}
          </>
        )}
      </div>
    </>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12, color: "#8b8b88" }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 700, wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

export default App;
