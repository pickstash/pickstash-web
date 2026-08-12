import { Navigate, useParams } from "react-router-dom";

// 049: /p/:id(공개 상자 요약 뷰) 폐기 — 공개 상자도 이제 /box/:id + BoxDetailClient로 읽기 전용
// 열람(can_read_box가 접근을 가른다). 구 공유 링크 호환을 위해 리다이렉트만 남겨둔다. 토스는 이
// 라우트 자체가 로그인 세션이 있어야만 도달하므로(App.tsx 로그인 게이트) 비로그인 걱정은 없다.
export function PublicBoxScreen() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/box/${id}`} replace />;
}
