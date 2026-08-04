import { Suspense, useEffect, useState, type CSSProperties } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import { BoxInviteScreen } from "./screens/box-invite-screen";
import { FolderInviteScreen } from "./screens/folder-invite-screen";
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
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // 로그인 직후엔 서버가 닉네임(실제 이름) 백필을 막 끝낸 상태 → 이전 세션의 캐시(예: '토스 사용자')를
      // 버리고 새로 불러온다. 로그아웃 시에도 남의 데이터가 남지 않게 정리.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") queryClient.clear();
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const { pathname } = useLocation();
  // 초대 뷰어(공유 링크)는 비로그인도 열람 가능 — 로그인 게이트 예외. 참여 시 인라인 로그인(nav.login).
  const isInviteRoute = pathname.startsWith("/invite/") || pathname.startsWith("/folder-invite/");
  // 탭바는 폼(집중)·초대 뷰어를 제외한 모든 화면. 초대 뷰어는 자체 '참여하기' CTA만 둔다.
  const showTabBar = !isFormRoute(pathname) && !isInviteRoute;

  if (!ready) return null;
  if (!session && !isInviteRoute) return <LoginScreen />;

  return (
    // 탭바가 뜨는 라우트에서만 --app-nav-h를 탭바 높이(3.5rem)로 올린다(하위 main·CTA가 상속).
    // 토스 웹뷰는 하단 safe-area를 웹뷰 밖에서 처리하므로 여기 env를 더하지 않는다(index.css에서 --app-cta-safe=0).
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

      {/* 공유 링크 뷰어(딥링크 intoss://pickstash/invite|folder-invite/<code>) — 비멤버 열람+참여 */}
      <Route path="/invite/:code" element={<BoxInviteScreen />} />
      <Route path="/folder-invite/:code" element={<FolderInviteScreen />} />

      {/* 마이페이지 */}
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="/profile/withdraw" element={<WithdrawPage />} />

      {/* 친구 초대(/box/:id/invite)는 카카오 공유라 웹 전용 — 토스는 네이티브 공유로 별도 구현 예정.
          미정의 경로는 홈으로. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    {/* 하단 탭바 — 등록·수정 폼을 제외한 모든 화면. 상세의 자체 액션바는 탭바 위로 뜬다. */}
    {showTabBar && <TabBar />}
    </Suspense>
    </div>
  );
}

// 탭바는 '집중' 화면(등록·수정 폼)만 빼고 모든 화면에 노출한다.
// 상세·목록·뷰어 등은 탭바 유지(자체 하단 액션바는 --app-nav-h로 탭바 위에 뜬다).
function isFormRoute(p: string): boolean {
  return (
    p === "/box/new" ||
    p === "/profile/withdraw" ||
    p.endsWith("/option/new") ||
    p.endsWith("/edit")
  );
}

export default App;
