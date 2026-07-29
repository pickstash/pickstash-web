-- 019_folder_sync.sql — 공유 폴더 라이브 동기화(구독). spec §3-7 확장.
-- 018은 참여 시점의 '스냅샷 복사'였다. 이제 소유자(원본 폴더)의 상자 추가/제외를
-- 구독자(복사본, folders.source_folder_id로 연결)에게 자동 전파한다.
--   · 소유자가 폴더에 상자 추가 → 구독자 전원 그 상자 참여자 등록 + 복사본 폴더에 분류 추가
--   · 소유자가 폴더에서 상자 제외 → 구독자 복사본에서 그 상자 분류 제거(참여 자격은 유지)
--   · 폴더 '삭제'는 전파하지 않는다(복사본은 독립 유지 — source_folder_id on delete set null로 구독만 종료).
-- box_folders AFTER INSERT/DELETE 트리거로 서버에서 일원화(웹·RN 공통). 순수 DB — 앱 코드 변경 없음.
-- 재실행 안전(idempotent: create index if not exists / or replace / drop trigger if exists).

-- 전파 대상 조회(source_folder_id = ...) 인덱스
create index if not exists folders_source_folder_id_idx on folders(source_folder_id);

create or replace function public.sync_folder_box_to_subscribers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_folder_id uuid;
  v_box_id uuid;
begin
  if tg_op = 'INSERT' then
    v_folder_id := new.folder_id;
    v_box_id := new.box_id;

    -- 이 폴더의 구독 복사본이 없으면 즉시 종료(일반 폴더 편집은 여기서 끝 — 오버헤드 최소).
    if not exists (select 1 from folders where source_folder_id = v_folder_id) then
      return new;
    end if;

    -- 구독자 전원: 상자 참여자 등록(이미 참여 중이면 유지)
    insert into box_participants (box_id, user_id)
    select v_box_id, cf.user_id
    from folders cf
    where cf.source_folder_id = v_folder_id
    on conflict do nothing;

    -- 구독자 전원: 복사본 폴더에 상자 분류 추가
    insert into box_folders (user_id, box_id, folder_id, sort)
    select cf.user_id, v_box_id, cf.id, new.sort
    from folders cf
    where cf.source_folder_id = v_folder_id
    on conflict (user_id, box_id, folder_id) do nothing;

    return new;

  else  -- DELETE
    v_folder_id := old.folder_id;
    v_box_id := old.box_id;

    -- 폴더 자체가 삭제되는 cascade면 전파하지 않는다(복사본은 독립 유지).
    -- FK cascade는 부모(folders) 삭제 후 자식(box_folders)에서 발생하므로 이 시점엔 폴더가 이미 없다.
    if not exists (select 1 from folders where id = v_folder_id) then
      return old;
    end if;

    -- 구독 복사본이 없으면 종료.
    if not exists (select 1 from folders where source_folder_id = v_folder_id) then
      return old;
    end if;

    -- 구독자 복사본에서 그 상자 분류만 제거(상자 참여 자격은 유지).
    delete from box_folders bf
    using folders cf
    where cf.source_folder_id = v_folder_id
      and bf.user_id = cf.user_id
      and bf.folder_id = cf.id
      and bf.box_id = v_box_id;

    return old;
  end if;
end;
$$;

drop trigger if exists trg_sync_folder_box on box_folders;
create trigger trg_sync_folder_box
  after insert or delete on box_folders
  for each row execute function public.sync_folder_box_to_subscribers();
