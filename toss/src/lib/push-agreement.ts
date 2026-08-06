import { requestNotificationAgreement } from "@apps-in-toss/web-framework";

// 토스 스마트 발송은 '알림 미동의' 유저를 자동으로 제외한다 → 로그인 후 한 번 동의를 받아야
// 댓글 등 푸시가 실제로 도달한다. templateCode는 콘솔 스마트발송(기능성) 소재의 코드.
// 동의창은 최초(newAgreement)에만 뜨고, 이미 동의했으면 조용히 alreadyAgreed로 끝난다.
// localStorage 플래그로 매 실행 재요청을 막는다(동의 완료 후엔 호출 자체를 생략).
const FLAG = "toss_push_agreed";
const TEMPLATE = import.meta.env.VITE_TOSS_NOTI_TEMPLATE as string | undefined;

export function requestPushAgreementOnce(): void {
  if (!TEMPLATE) return; // 템플릿 코드 미설정 환경(웹/개발)에선 no-op
  try {
    if (localStorage.getItem(FLAG) === "1") return;
  } catch {
    /* 스토리지 접근 불가 → 그냥 진행 */
  }
  try {
    const cleanup = requestNotificationAgreement({
      options: { templateCode: TEMPLATE },
      onEvent: (result) => {
        // newAgreement · alreadyAgreed 모두 '동의됨' → 다신 안 물어봄. 거부는 다음에 다시 시도.
        if (result.type !== "agreementRejected") {
          try { localStorage.setItem(FLAG, "1"); } catch { /* noop */ }
        }
        cleanup();
      },
      onError: (e) => {
        // 구버전 토스앱·미지원 환경 등 — 조용히 무시(푸시는 다음 기회에).
        console.warn("[push] agreement error", e);
        cleanup();
      },
    });
  } catch (e) {
    console.warn("[push] agreement threw", e);
  }
}

export type PushAgreeResult = "newAgreement" | "alreadyAgreed" | "agreementRejected" | "unsupported";

// 설정 화면 '알림 켜기' 버튼용 — 게이트 없이 매번 동의를 요청하고 결과를 Promise로 준다.
export function requestPushAgreement(): Promise<PushAgreeResult> {
  return new Promise((resolve) => {
    if (!TEMPLATE) return resolve("unsupported");
    try {
      const cleanup = requestNotificationAgreement({
        options: { templateCode: TEMPLATE },
        onEvent: (result) => {
          if (result.type !== "agreementRejected") {
            try { localStorage.setItem(FLAG, "1"); } catch { /* noop */ }
          }
          cleanup();
          resolve(result.type as PushAgreeResult);
        },
        onError: (e) => {
          console.warn("[push] agreement error", e);
          cleanup();
          resolve("unsupported");
        },
      });
    } catch (e) {
      console.warn("[push] agreement threw", e);
      resolve("unsupported");
    }
  });
}
