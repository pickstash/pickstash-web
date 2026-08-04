-- 025 탈퇴 버그 수정: options.created_by FK가 profiles 삭제를 막던 문제
-- delete_account()는 auth.users 삭제 → profiles CASCADE 삭제인데,
-- options.created_by(NO ACTION, NOT NULL)가 이를 막아 선택지를 만든 유저는 탈퇴가 실패했다.
-- 떠난 유저의 선택지는 상자(공유 콘텐츠)에 남겨야 하므로 nullable + ON DELETE SET NULL로 교체.
-- idempotent: drop not null(재실행 no-op) + drop constraint if exists + add.

alter table public.options alter column created_by drop not null;
alter table public.options drop constraint if exists options_created_by_fkey;
alter table public.options add constraint options_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;
