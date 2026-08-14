import { useState } from "react";
import { Icon } from "@/components/icon";
import { requestPushAgreementOnce, isPushAgreed } from "../lib/push-agreement";

// 알림함 최상단에 보이는 '알림 받기' 카드 — 설정 화면 버튼은 아무도 못 찾길래 여기 노출한다.
// 화면을 열자마자 자동으로 뜨는 게 아니라 이 카드 안의 버튼을 눌러야만 동의창이 뜬다(클릭 트리거만
// 허용 — 앱인토스 "미니앱 접속 직후 바텀시트 노출" 다크패턴 정책, 여러 차례 반려로 확인됨).
export function AlertsPushBanner() {
  const [agreed, setAgreed] = useState(isPushAgreed);
  const [requesting, setRequesting] = useState(false);

  if (agreed) return null;

  function handleClick() {
    if (requesting) return;
    setRequesting(true);
    requestPushAgreementOnce(() => {
      setRequesting(false);
      setAgreed(isPushAgreed());
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={requesting}
      className="flex w-full items-center gap-3 rounded-card border border-line bg-paper px-4 py-3.5 text-left active:bg-cream disabled:opacity-60"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-butter-tint text-ink">
        <Icon name="bell" size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold text-ink">알림 받기</span>
        <span className="block text-[11.5px] text-ink-soft">댓글·참여 같은 소식을 토스 알림으로 받아요</span>
      </span>
      <span className="shrink-0 text-[12px] font-bold text-ink-soft">{requesting ? "확인 중…" : "받기"}</span>
    </button>
  );
}
