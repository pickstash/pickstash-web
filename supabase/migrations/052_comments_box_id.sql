-- 052_comments_box_id.sql — 댓글 실시간(realtime) 전달 복구.
--   증상: 댓글을 달면 알림(push)은 오는데, 다른 참여자 화면에 실시간으로 안 뜨고 나갔다 와야 보인다.
--   원인: comments의 SELECT 정책이 options로 서브쿼리 조인(EXISTS(select 1 from options ...))이라
--         realtime postgres_changes가 구독자에게 변경 이벤트를 전달하지 못한다.
--         (options·votes는 can_read_box(box_id) '직접 참조'라 실시간이 정상 동작.)
--   해결: comments에 box_id를 비정규화하고 SELECT 정책을 can_read_box(box_id) 직접 참조로 교체.
--         읽기 의미는 동일(box_id = 그 옵션의 box_id). 클라이언트 코드 변경 불필요.
-- 재실행 안전(add column if not exists / create or replace / drop ... if exists).
-- 배포 순서: 코드 배포와 무관하게, 이 마이그레이션을 대시보드에서 실행하면 즉시 실시간이 살아난다.

alter table comments add column if not exists box_id uuid references boxes(id) on delete cascade;

-- 기존 댓글 백필(option → box).
update comments c set box_id = o.box_id
from options o where o.id = c.option_id and c.box_id is null;

-- 새 댓글 insert 시 box_id 자동 채움(앱 수정 없이 항상 채워지게).
create or replace function comments_fill_box_id()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.box_id is null then
    select box_id into new.box_id from options where id = new.option_id;
  end if;
  return new;
end $$;

drop trigger if exists comments_box_id_bi on comments;
create trigger comments_box_id_bi before insert on comments
  for each row execute function comments_fill_box_id();

-- SELECT 정책을 직접 참조로 교체 → realtime이 변경 행의 RLS를 평가해 참여자에게 전달할 수 있다.
-- INSERT/UPDATE/DELETE 정책은 그대로 둔다(트리거가 box_id를 미리 채우므로 영향 없음).
drop policy if exists "comments: 참여자 조회" on comments;
create policy "comments: 참여자 조회" on comments for select using (can_read_box(box_id));
