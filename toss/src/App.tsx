import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { LoginScreen } from "./screens/login-screen";
import { HomeScreen } from "./screens/home-screen";

// 세션 유무로 로그인 게이트 ↔ 라우팅. 로그인되면 웹과 동일한 화면들을 공유 컴포넌트로 렌더.
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return null;
  if (!session) return <LoginScreen />;

  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      {/* 화면 이식 진행에 따라 route 추가 (box/[id], profile, folder/[id] …) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
