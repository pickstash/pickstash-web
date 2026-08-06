import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import {
  getMyNotificationPrefs,
  setNotificationPref,
  NOTIF_DEFAULTS,
  type NotifType,
  type NotificationPrefs,
} from "@/lib/api/notifications";
import { requestPushAgreement } from "../lib/push-agreement";

const TYPES: { key: NotifType; label: string; desc: string }[] = [
  { key: "comment", label: "새 댓글", desc: "내 상자에 댓글이 달리면" },
  { key: "mention", label: "멘션", desc: "누가 나를 언급하면" },
  { key: "option", label: "새 선택지", desc: "상자에 후보가 추가되면" },
  { key: "decision", label: "정리 완료", desc: "상자가 정리되면" },
  { key: "join", label: "새 참여자", desc: "상자·서랍에 새로 참여하면" },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors ${on ? "bg-ink" : "bg-line"}`}
    >
      <span
        className={`absolute top-[3px] h-[20px] w-[20px] rounded-full bg-paper shadow-sm transition-all ${on ? "left-[21px]" : "left-[3px]"}`}
      />
    </button>
  );
}

export function NotificationSettingsScreen() {
  const qc = useQueryClient();
  const { data: prefs = NOTIF_DEFAULTS } = useQuery({ queryKey: ["notif-prefs"], queryFn: getMyNotificationPrefs });
  const [agreeMsg, setAgreeMsg] = useState<string | null>(null);

  const toggle = useMutation({
    mutationFn: ({ key, on }: { key: NotifType; on: boolean }) => setNotificationPref(key, on),
    onMutate: async ({ key, on }) => {
      await qc.cancelQueries({ queryKey: ["notif-prefs"] });
      const prev = qc.getQueryData<NotificationPrefs>(["notif-prefs"]);
      qc.setQueryData<NotificationPrefs>(["notif-prefs"], (o) => ({ ...(o ?? NOTIF_DEFAULTS), [key]: on }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notif-prefs"], ctx.prev);
    },
  });

  async function enablePush() {
    setAgreeMsg("요청 중…");
    const r = await requestPushAgreement();
    setAgreeMsg(
      r === "agreementRejected"
        ? "알림을 거부했어요. 오른쪽 위 ···(앱 설정) → 알림에서 켤 수 있어요."
        : r === "unsupported"
          ? "이 환경에선 알림 요청이 지원되지 않아요."
          : "알림이 켜졌어요.",
    );
  }

  return (
    <main className="min-h-dvh bg-cream pb-10">
      <PageHeader title="알림 설정" />
      <div className="mx-auto max-w-[430px] space-y-5 px-5 pt-2">
        {/* 마스터 — 토스 동의(켜기). 끄기는 토스 앱 설정 안내(앱에서 OFF API 없음). */}
        <section className="rounded-card border border-line bg-paper p-4">
          <p className="text-[14px] font-extrabold text-ink">앱 알림 받기</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
            알림을 받으려면 토스 알림 동의가 필요해요.
          </p>
          <button
            onClick={enablePush}
            className="mt-3 w-full rounded-field bg-ink py-3 text-sm font-bold text-cream active:opacity-80"
          >
            알림 켜기
          </button>
          {agreeMsg && <p className="mt-2 text-center text-[12px] text-ink-soft">{agreeMsg}</p>}
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
            결정창고 알림만 끄려면 오른쪽 위 <b className="font-bold">···(앱 설정)</b> → 알림을 꺼주세요.
            토스 앱 알림은 그대로 유지돼요.
          </p>
        </section>

        {/* 세부 — 유형별 on/off (우리 DB). 꺼두면 그 유형 푸시는 안 와요. */}
        <section>
          <p className="mb-2 px-1 text-[12px] font-bold text-ink-soft">세부 알림</p>
          <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-paper">
            {TYPES.map((t) => (
              <div key={t.key} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold text-ink">{t.label}</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-soft">{t.desc}</p>
                </div>
                <Toggle on={prefs[t.key]} onChange={(v) => toggle.mutate({ key: t.key, on: v })} />
              </div>
            ))}
          </div>
          <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-ink-faint">
            세부 알림을 꺼도 앱 알림 자체는 유지돼요. 결정창고 알림을 아예 끄려면 오른쪽 위 ···(앱 설정) → 알림에서 꺼주세요.
          </p>
        </section>
      </div>
    </main>
  );
}
