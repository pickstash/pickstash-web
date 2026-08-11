import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { setIosSwipeGestureEnabled } from "@apps-in-toss/web-framework";
import { supabase } from "./lib/supabase";
import { requestPushAgreementOnce } from "./lib/push-agreement";
import { useRealtimeAlerts } from "@/hooks/use-realtime-alerts";
import { LoginScreen } from "./screens/login-screen";
import { ScreenLoading } from "./screens/screen-state";
import { HomeScreen } from "./screens/home-screen";
import { NotificationSettingsScreen } from "./screens/notification-settings-screen";
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
import { ExploreScreen } from "./screens/explore-screen";
import { PublicBoxScreen } from "./screens/public-box-screen";
import { ProfileViewScreen } from "./screens/profile-view-screen";
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

  // Supabase는 실제 로그인 때뿐 아니라 웹뷰가 백그라운드 갔다 포커스를 되찾을 때도(예: 토스
  // 푸시알림 배너가 잠깐 화면을 덮었다 사라질 때) 세션을 재검증하며 같은 유저로 SIGNED_IN을 다시
  // 쏜다. 이걸 실제 로그인과 구분 못 하면 댓글 입력 중 캐시가 통째로 날아가 화면이 리마운트되고
  // 입력하던 내용이 사라진다 — user id가 실제로 바뀐 경우에만 로그인 부수효과를 실행한다.
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // 알림 동의 바텀시트는 미니앱 접속 직후 바로 뜨면 안 된다(심사 반려 사유) — 첫 화면을
    // 어느 정도 보고 난 뒤에 자연스럽게 뜨도록 지연시킨다. 언마운트 시 취소.
    const timers: ReturnType<typeof setTimeout>[] = [];
    function requestPushAgreementDelayed() {
      timers.push(setTimeout(requestPushAgreementOnce, 3000));
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
      prevUserIdRef.current = data.session?.user.id ?? null;
      // 이미 로그인된 채 재실행 → 아직 동의 안 받았으면 이때 요청(내부에서 1회 가드).
      if (data.session) requestPushAgreementDelayed();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      const nextUserId = s?.user.id ?? null;
      const isActualSignIn = event === "SIGNED_IN" && nextUserId !== prevUserIdRef.current;
      prevUserIdRef.current = nextUserId;
      // 로그인 직후엔 서버가 닉네임(실제 이름) 백필을 막 끝낸 상태 → 이전 세션의 캐시(예: '토스 사용자')를
      // 버리고 새로 불러온다. 로그아웃 시에도 남의 데이터가 남지 않게 정리.
      if (isActualSignIn || event === "SIGNED_OUT") queryClient.clear();
      // 로그인 시 푸시 알림 동의 요청(미동의 유저는 스마트발송에서 제외됨). 내부에서 1회만.
      if (isActualSignIn) requestPushAgreementDelayed();
    });
    return () => {
      sub.subscription.unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, [queryClient]);

  const { pathname } = useLocation();
  // 화면 전환 시 스크롤 맨 위로 — MemoryRouter는 스크롤 복원이 없어, 이전 화면의 스크롤 위치가
  // 새 화면(홈·상자 등)으로 새는 것을 막는다. (스크롤러는 document/body.)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  // 뒤로가기 통제(iOS 스와이프 OFF + 홈 종료 확인)는 BackHandler가 담당 — main.tsx에서 App 형제로 항상 마운트.
  // 초대 뷰어(공유 링크)는 비로그인도 열람 가능 — 로그인 게이트 예외. 참여 시 인라인 로그인(nav.login).
  const isInviteRoute = pathname.startsWith("/invite/") || pathname.startsWith("/folder-invite/");
  // 탭바는 폼(집중)·초대 뷰어를 제외한 모든 화면. 초대 뷰어는 자체 '참여하기' CTA만 둔다.
  const showTabBar = !isFormRoute(pathname) && !isInviteRoute;
  // 배너는 홈·알림에서(탭바 위 고정). 그 높이를 --app-nav-h에 더해 콘텐츠가 배너 위로 밀리게 한다.
  const showBanner = (pathname === "/" || pathname === "/alerts") && showTabBar;

  // iOS 엣지 스와이프 뒤로가기는 홈·로그인에서만 OFF(실수로 앱이 종료되는 것 방지) — 나머지 화면은 ON(편의).
  //   홈 = 로그인 상태의 '/'. 로그인 = 세션 없음(초대 뷰어 제외, LoginScreen이 뜨는 조건). 둘 다 '/'에 있어도 안전.
  //   backEvent는 useHardwareBack(BackHandler)이 항상 처리 → 하위 화면 스와이프=navigate(-1), 홈=종료 확인.
  const blockSwipeBack = (!session && !isInviteRoute) || pathname === "/";
  useEffect(() => {
    try {
      void setIosSwipeGestureEnabled({ isEnabled: !blockSwipeBack });
    } catch {
      /* 브라우저·미지원 환경 → noop */
    }
  }, [blockSwipeBack, pathname]);

  if (!ready) return null;
  if (!session && !isInviteRoute) return <LoginScreen />;

  return (
    // --app-tabbar-h: TabBar 자신이 useLayoutEffect + ResizeObserver로 실측해 :root에 세팅한다
    //   (tab-bar.tsx 참고) — 아이콘·라벨·패딩이 정하는 내용 기반 높이라 여기서 rem 상수로 흉내내면
    //   AdBanner가 탭바 실제 높이보다 낮게 자리잡아 가려지는 사고가 났었다(재발 금지).
    // --app-nav-h: 탭바 있는 라우트에서만 탭바 실제 높이로 올린다(하위 main·CTA가 상속). 실측된
    //   --app-tabbar-h에 배너 높이를 더한 값(배너가 탭바 위에 얹히므로 콘텐츠는 그만큼 더 밀려야 한다).
    // --app-cta-safe: 하단 CTA가 먹을 인셋. 탭바 화면은 CTA가 이미 --app-nav-h만큼 탭바 위로 떠서
    //   탭바가 홈 인디케이터를 전담 → 0(여기서 또 더하면 이중 계산으로 버튼이 붕 뜬다).
    //   폼 화면(탭바 없음)은 CTA가 bottom-0라 직접 인셋(safe-bottom)이 필요하다.
    <div
      style={{
        "--app-banner-h": showBanner ? "56px" : "0px", // 배너 높이(권장 96px보다 낮춤 — 너무 높아 보여서)
        "--app-nav-h": showTabBar
          ? "calc(var(--app-tabbar-h, 0px) + var(--app-banner-h, 0px))"
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

      {/* 소셜(개편) — 탐색 / 공개 상자 뷰어 / 남의 공개 프로필 */}
      <Route path="/explore" element={<ExploreScreen />} />
      <Route path="/p/:id" element={<PublicBoxScreen />} />
      <Route path="/u/:handle" element={<ProfileViewScreen />} />

      {/* 알림함 — 푸시(intoss://pickstash/alerts 고정) 목적지 */}
      <Route path="/alerts" element={<AlertsScreen />} />

      {/* 마이페이지 */}
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="/profile/withdraw" element={<WithdrawPage />} />

      {/* 알림 설정 */}
      <Route path="/settings/notifications" element={<NotificationSettingsScreen />} />

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
    p.startsWith("/settings") ||
    p.startsWith("/p/") || // 공개 상자 뷰어 — 자체 하단 '함께하기 신청' CTA
    p.endsWith("/option/new") ||
    p.endsWith("/edit")
  );
}

export default App;
