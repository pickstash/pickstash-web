// 토스 화면 공용 로딩·에러 상태 (웹은 서버 렌더라 불필요, 토스는 CSR fetch라 필요).
import { Spinner } from "@/components/spinner";

// 화면 진입·탭 이동 로딩. 딤 없이 중앙 인라인 스피너로 통일(리스트 로딩과 동일 디자인).
export function ScreenLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner size={96} />
    </div>
  );
}

export function ScreenError({ message = "화면을 불러오지 못했어요" }: { message?: string }) {
  return <div className="flex min-h-dvh items-center justify-center px-6 text-center text-tomato">{message}</div>;
}
