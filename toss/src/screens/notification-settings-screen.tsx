import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import {
  getMyNotificationPrefs,
  setNotificationPref,
  NOTIF_DEFAULTS,
  type NotifType,
  type NotificationPrefs,
} from "@/lib/api/notifications";

const TYPES: { key: NotifType; label: string; desc: string }[] = [
  { key: "comment", label: "새 댓글", desc: "내 상자에 댓글이 달리면" },
  { key: "mention", label: "멘션", desc: "누가 나를 언급하면" },
  { key: "option", label: "새 선택지", desc: "상자에 후보가 추가되면" },
  { key: "decision", label: "정리 완료", desc: "상자가 정리되면" },
  { key: "join", label: "새 참여자", desc: "상자·서랍에 새로 참여하면" },
  { key: "invite", label: "초대받음", desc: "누가 나를 상자·서랍에 초대하면" },
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

  return (
    <main className="min-h-dvh bg-cream pb-[calc(var(--app-safe-bottom,0px)+3rem)]">
      <PageHeader title="알림 설정" />
      <div className="mx-auto max-w-[430px] space-y-5 px-5 pt-2">
        {/* 마스터 — 앱 알림 on/off는 토스 앱 설정에서만 가능. 토스 SDK엔 OS 권한 재요청·상태확인·설정창 열기 API가 없어
            (Notification.requestAgreement는 최초 1회만 동의창을 띄우고 이후 alreadyAgreed로 조용히 끝남),
            '알림 켜기' 버튼은 이미 동의된 상태에선 아무 일도 못 한다 → 버튼 대신 켜고 끄는 경로만 안내. */}
        <section className="rounded-card border border-line bg-paper p-4">
          <p className="text-[14px] font-extrabold text-ink">앱 알림 받기</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
            결정창고 알림은 토스에 로그인하면 자동으로 켜져요.<br/>알림이 오지 않는다면 아래에서 켜져 있는지 확인해요.
          </p>
          <div className="mt-3 rounded-field bg-cream px-3.5 py-3">
            <p className="text-[12px] font-bold text-ink">알림 켜기·끄기</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
              오른쪽 위 <b className="font-bold text-ink">···(앱 설정)</b> → <b className="font-bold text-ink">알림</b>에서
              결정창고 알림을 켜거나 끌 수 있어요. 토스 앱 전체 알림은 그대로 유지돼요.
            </p>
          </div>
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
          <p className="mt-2 px-1 pb-12 text-[11.5px] leading-relaxed text-ink-faint">
            세부 알림을 꺼도 앱 알림 자체는 유지돼요. 결정창고 알림을 아예 끄려면 오른쪽 위 ···(앱 설정) → 알림에서 꺼주세요.
          </p>
        </section>
      </div>
    </main>
  );
}
