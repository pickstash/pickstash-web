import { Suspense, useEffect, useState, type CSSProperties } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { LoginScreen } from "./screens/login-screen";
import { ScreenLoading } from "./screens/screen-state";
import { HomeScreen } from "./screens/home-screen";
import { BoxListScreen } from "./screens/box-list-screen";
import { BoxesScreen } from "./screens/boxes-screen";
import { BoxDetailScreen } from "./screens/box-detail-screen";
import { OptionDetailScreen } from "./screens/option-detail-screen";
import { FolderScreen } from "./screens/folder-screen";
import { FoldersScreen } from "./screens/folders-screen";
import { ProfileScreen } from "./screens/profile-screen";
import { BoxLinksScreen, OptionNewScreen, OptionEditScreen } from "./screens/reused-pages";
import { TabBar } from "./components/tab-bar";
// 파라미터 없는 A형 페이지는 웹 페이지 컴포넌트를 그대로 라우팅(그대로 재사용).
import NewBoxPage from "@/app/box/new/page";
import WithdrawPage from "@/app/profile/withdraw/page";

// 세션 유무로 로그인 게이트 ↔ 라우팅. 로그인되면 웹과 동일한 화면을 공유 컴포넌트로 렌더.
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

  const { pathname } = useLocation();
  const showTabBar = TAB_ROUTES.has(pathname);

  if (!ready) return null;
  if (!session) return <LoginScreen />;

  return (
    // 탭바가 뜨는 라우트에서만 --app-nav-h를 탭바 콘텐츠 높이(3.5rem)로 올린다(하위 main·CTA가 상속).
    // safe-area는 넣지 않는다: 탭바 자신(pb-safe)과 CTA(pb-safe)가 각자 처리하므로,
    // 여기서 또 더하면 이중 계산으로 CTA가 탭바 위로 과하게 떠 큰 공백이 생긴다.
    // 탭바 없는 화면은 0 → CTA가 하단에 딱 붙는다.
    <div style={{ "--app-nav-h": showTabBar ? "3.5rem" : "0px" } as CSSProperties}>
    {/* 재사용하는 A형 웹 페이지가 use(params)로 순간 suspend할 수 있어 Suspense 경계 필수. */}
    <Suspense fallback={<ScreenLoading />}>
    <Routes>
      <Route path="/" element={<HomeScreen />} />

      {/* 상자 탭 — 진행중/정리됨/즐겨찾기 필터 통합 */}
      <Route path="/boxes" element={<BoxesScreen />} />

      {/* 옛 창고 목록 경로 (탭에서 필터로 흡수됨, 딥링크 호환 위해 유지) */}
      <Route path="/messy" element={<BoxListScreen kind="messy" />} />
      <Route path="/done" element={<BoxListScreen kind="done" />} />
      <Route path="/favorites" element={<BoxListScreen kind="favorites" />} />

      {/* 상자 */}
      <Route path="/box/new" element={<NewBoxPage />} />
      <Route path="/box/:id" element={<BoxDetailScreen />} />
      <Route path="/box/:id/links" element={<BoxLinksScreen />} />
      <Route path="/box/:id/option/new" element={<OptionNewScreen />} />
      <Route path="/box/:id/option/:optionId" element={<OptionDetailScreen />} />
      <Route path="/box/:id/option/:optionId/edit" element={<OptionEditScreen />} />

      {/* 폴더 */}
      <Route path="/folders" element={<FoldersScreen />} />
      <Route path="/folder/:id" element={<FolderScreen />} />

      {/* 마이페이지 */}
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="/profile/withdraw" element={<WithdrawPage />} />

      {/* 친구 초대(/box/:id/invite)는 카카오 공유라 웹 전용 — 토스는 네이티브 공유로 별도 구현 예정.
          미정의 경로는 홈으로. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    {/* 하단 탭바 — 상위(브라우징) 화면에서만. 상세·폼 화면은 자체 하단 액션이 있어 제외. */}
    {showTabBar && <TabBar />}
    </Suspense>
    </div>
  );
}

// 탭바를 노출할 상위 라우트 = 4개 탭 목적지 (상세·폼·생성 화면은 제외)
const TAB_ROUTES = new Set(["/", "/boxes", "/folders", "/profile"]);

export default App;
