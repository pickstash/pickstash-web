import { useCallback, useState } from "react";
import { closeView } from "@apps-in-toss/web-framework";
import { useHardwareBack } from "../lib/use-hardware-back";

// 뒤로가기 통제 + 홈에서의 '종료 확인' 모달.
// App의 early return(온보딩·로딩)과 무관하게 항상 떠야 하므로 main.tsx에서 App 형제로 마운트한다.
// 홈에서 뒤로가기 → 바로 종료(closeView) 대신 이 모달 → '종료'를 눌러야 나간다.
export function BackHandler() {
  const [exitOpen, setExitOpen] = useState(false);
  const openExit = useCallback(() => setExitOpen(true), []);
  useHardwareBack(openExit);

  if (!exitOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-8">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setExitOpen(false)} />
      <div className="relative w-full max-w-[300px] rounded-[20px] bg-paper p-5 shadow-[0_16px_40px_rgba(42,42,39,0.25)]">
        <p className="text-[15px] font-extrabold text-ink">결정창고를 종료할까요?</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">토스 홈으로 나가요.</p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setExitOpen(false)}
            className="flex-1 rounded-field border border-line py-3 text-[13px] font-bold text-ink-soft"
          >
            취소
          </button>
          <button
            onClick={() => {
              setExitOpen(false);
              void closeView().catch(() => {});
            }}
            className="flex-1 rounded-field bg-ink py-3 text-[13px] font-bold text-cream"
          >
            종료
          </button>
        </div>
      </div>
    </div>
  );
}
