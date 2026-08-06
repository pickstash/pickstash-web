-- 028: 유형별 알림 on/off. 기본 전부 on(행 없으면 전부 켜진 것으로 간주).
-- 발송 라우트(/api/toss/send)가 대상별로 해당 유형이 꺼져 있으면 스킵한다.
-- 토스는 앱에서 권한 OFF가 불가 → 세부 제어는 이 앱 레벨 pref로만 가능.
-- 재실행 안전.

create table if not exists public.notification_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  comment_enabled  boolean not null default true,  -- 새 댓글
  mention_enabled  boolean not null default true,  -- 나를 멘션
  option_enabled   boolean not null default true,  -- 새 선택지
  decision_enabled boolean not null default true,  -- 정리 완료
  join_enabled     boolean not null default true,  -- 새 참여자
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop policy if exists notif_prefs_select on public.notification_prefs;
create policy notif_prefs_select on public.notification_prefs
  for select using (auth.uid() = user_id);

drop policy if exists notif_prefs_insert on public.notification_prefs;
create policy notif_prefs_insert on public.notification_prefs
  for insert with check (auth.uid() = user_id);

drop policy if exists notif_prefs_update on public.notification_prefs;
create policy notif_prefs_update on public.notification_prefs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
