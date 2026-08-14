import { requestNotificationAgreement } from "@apps-in-toss/web-framework";

// 토스 스마트 발송은 '알림 미동의' 유저를 자동으로 제외한다 → 로그인 후 한 번 동의를 받아야
// 댓글 등 푸시가 실제로 도달한다. templateCode는 콘솔 스마트발송(기능성) 소재의 코드.
// 동의창은 최초(newAgreement)에만 뜨고, 이미 동의했으면 조용히 alreadyAgreed로 끝난다.
// localStorage 플래그로 매 실행 재요청을 막는다(동의 완료 후엔 호출 자체를 생략).
const FLAG = "toss_push_agreed";
const TEMPLATE = import.meta.env.VITE_TOSS_NOTI_TEMPLATE as string | undefined;

// 이미 동의 완료했는지 — 알림 설정 화면이 버튼 대신 '이미 켜져 있어요' 상태를 보여줄 때 씀.
export function isPushAgreed(): boolean {
  try {
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

// ⚠️ 반드시 사용자가 직접 누른 액션(예: 알림 설정 화면의 버튼, 알림 탭 진입)에서만 호출할 것 —
// 앱 진입·로그인 직후 자동으로 호출하면 "미니앱 접속 직후 바텀시트 노출" 다크패턴으로 반려된다
// (3회 이상 반복됨).
export function requestPushAgreementOnce(onDone?: () => void): void {
  if (!TEMPLATE) { onDone?.(); return; } // 템플릿 코드 미설정 환경(웹/개발)에선 no-op
  if (isPushAgreed()) { onDone?.(); return; }
  try {
    const cleanup = requestNotificationAgreement({
      options: { templateCode: TEMPLATE },
      onEvent: (result) => {
        // newAgreement · alreadyAgreed 모두 '동의됨' → 다신 안 물어봄. 거부는 다음에 다시 시도.
        if (result.type !== "agreementRejected") {
          try { localStorage.setItem(FLAG, "1"); } catch { /* noop */ }
        }
        cleanup();
        onDone?.();
      },
      onError: (e) => {
        // 구버전 토스앱·미지원 환경 등 — 조용히 무시(푸시는 다음 기회에).
        console.warn("[push] agreement error", e);
        cleanup();
        onDone?.();
      },
    });
  } catch (e) {
    console.warn("[push] agreement threw", e);
    onDone?.();
  }
}

// 알림 탭 진입 시 자동 요청용 — 앱 진입 직후가 아니라 사용자가 알림을 보러 직접 들어간 맥락에서만
// 뜨므로 다크패턴이 아니다. 다만 거절한 뒤 알림 탭을 계속 들락거리면 매번 재요청 창이 뜨는 건 그
// 자체로 성가시니(별개 성격의 다크패턴), 이번 앱 세션 동안은 1회만 시도한다 — 모듈 스코프라 새로
// 실행(콜드 스타트)할 때마다 초기화된다. isPushAgreed()가 true면 애초에 no-op.
let askedThisSession = false;
export function requestPushAgreementOnAlertsVisit(): void {
  if (askedThisSession || isPushAgreed()) return;
  askedThisSession = true;
  requestPushAgreementOnce();
}
