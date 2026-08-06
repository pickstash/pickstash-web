import { Suspense, useEffect, useState, type CSSProperties } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { requestPushAgreementOnce } from "./lib/push-agreement";
import { useRealtimeAlerts } from "@/hooks/use-realtime-alerts";
import { LoginScreen } from "./screens/login-screen";
import { ScreenLoading } from "./screens/screen-state";
import { HomeScreen } from "./screens/home-screen";
import { OnboardingScreen } from "./screens/onboarding-screen";
import { useHome } from "./lib/use-home";
import { BoxListScreen } from "./screens/box-list-screen";
import { BoxesScreen } from "./screens/boxes-screen";
import { BoxDetailScreen } from "./screens/box-detail-screen";
import { OptionDetailScreen } from "./screens/option-detail-screen";
import { FolderScreen } from "./screens/folder-screen";
import { FoldersScreen } from "./screens/folders-screen";
import { BoxInviteScreen } from "./screens/box-invite-screen";
import { FolderInviteScreen } from "./screens/folder-invite-screen";
import { ProfileScreen } from "./screens/profile-screen";
import { AlertsScreen } from "./screens/alerts-screen";
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

  // 알림 실시간 구독을 앱 셸에서 항상 켜둔다 — /alerts 화면에서만 켜면 다른 탭에
  // 있는 동안 탭바 배지가 안 갱신된다(왔다갔다 해야 뜨는 것처럼 보이던 원인).
  useRealtimeAlerts();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
      // 이미 로그인된 채 재실행 → 아직 동의 안 받았으면 이때 요청(내부에서 1회 가드).
      if (data.session) requestPushAgreementOnce();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // 로그인 직후엔 서버가 닉네임(실제 이름) 백필을 막 끝낸 상태 → 이전 세션의 캐시(예: '토스 사용자')를
      // 버리고 새로 불러온다. 로그아웃 시에도 남의 데이터가 남지 않게 정리.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") queryClient.clear();
      // 로그인 시 푸시 알림 동의 요청(미동의 유저는 스마트발송에서 제외됨). 내부에서 1회만.
      if (event === "SIGNED_IN") requestPushAgreementOnce();
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const { pathname } = useLocation();
  // 초대 뷰어(공유 링크)는 비로그인도 열람 가능 — 로그인 게이트 예외. 참여 시 인라인 로그인(nav.login).
  const isInviteRoute = pathname.startsWith("/invite/") || pathname.startsWith("/folder-invite/");
  // 탭바는 폼(집중)·초대 뷰어를 제외한 모든 화면. 초대 뷰어는 자체 '참여하기' CTA만 둔다.
  const showTabBar = !isFormRoute(pathname) && !isInviteRoute;
  // 배너는 홈에서만(탭바 위 고정). 그 높이를 --app-nav-h에 더해 CTA·콘텐츠가 배너 위로 밀리게 한다.
  const showBanner = pathname === "/" && showTabBar;

  // 홈에서만 홈 데이터를 미리 본다(첫 로그인=상자 0개면 온보딩 전용 화면으로 분기). HomeScreen과 ['home'] 공유.
  const home = useHome(pathname === "/" && !!session);

  if (!ready) return null;
  if (!session && !isInviteRoute) return <LoginScreen />;

  // 첫 로그인(상자 open·done 모두 0) → 헤더·탭바 없이 온보딩 전용, 하단엔 배너만.
  if (pathname === "/" && session) {
    if (home.isPending) return <ScreenLoading />;
    if (home.data && home.data.openCount === 0 && home.data.doneCount === 0) {
      // 온보딩은 광고 없이 — 첫 화면은 방해 없이 상자 만들기에 집중.
      return <OnboardingScreen nickname={home.data.nickname} />;
    }
  }

  return (
    // --app-nav-h: 탭바 있는 라우트에서만 탭바 실제 높이(3.5rem + iOS 홈 인디케이터 인셋)로 올린다(하위 main·CTA가 상속).
    // --app-cta-safe: 하단 CTA가 먹을 인셋. 탭바 화면은 CTA가 이미 --app-nav-h만큼 탭바 위로 떠서
    //   탭바가 홈 인디케이터를 전담 → 0(여기서 또 더하면 이중 계산으로 버튼이 붕 뜬다).
    //   폼 화면(탭바 없음)은 CTA가 bottom-0라 직접 인셋(safe-bottom)이 필요하다.
    <div
      style={{
        "--app-banner-h": showBanner ? "96px" : "0px", // 앱인토스 고정형 배너 권장 높이
        "--app-nav-h": showTabBar
          ? "calc(3.5rem + var(--app-safe-bottom, 0px) + var(--app-banner-h, 0px))"
          : "0px",
        "--app-cta-safe": showTabBar ? "0px" : "var(--app-safe-bottom, 0px)",
      } as CSSProperties}
    >

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

      {/* 알림함 — 푸시(intoss://pickstash/alerts 고정) 목적지 */}
      <Route path="/alerts" element={<AlertsScreen />} />

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
