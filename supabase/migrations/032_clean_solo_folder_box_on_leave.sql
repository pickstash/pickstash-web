-- 032: 상자에서 나갈 때, '나 혼자 쓰는 서랍'에 남은 그 상자 링크를 자동 제거(dangling 방지)
-- 증상: 상자를 자기 서랍에 담아뒀다가 그 상자에서 나가면 box_folders 행이 남아,
--   서랍 목록엔 '상자 N개'로 세지만 상세(참여자만 보임, RLS)엔 0개로 뜨는 불일치가 생김.
-- 해결: box_participants DELETE 시, 나간 유저가 유일 멤버인 서랍(개인 서랍)에서 그 상자를 뺀다.
--   공유 서랍(멤버 2명+)은 다른 멤버가 계속 쓰므로 건드리지 않는다(목록 카운트는 로더에서 참여 스코프로 보정).
-- 재실행 안전(create or replace + drop trigger if exists).

create or replace function public.clean_solo_folder_box_on_leave()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  delete from box_folders bf
  where bf.box_id = old.box_id
    and bf.folder_id in (
      select fm.folder_id
      from folder_members fm
      where fm.user_id = old.user_id
        and (select count(*) from folder_members f2 where f2.folder_id = fm.folder_id) = 1
    );
  return old;
end;
$$;

drop trigger if exists trg_clean_solo_folder_box_on_leave on box_participants;
create trigger trg_clean_solo_folder_box_on_leave
  after delete on box_participants
  for each row execute function public.clean_solo_folder_box_on_leave();
