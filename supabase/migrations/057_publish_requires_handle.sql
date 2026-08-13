-- 057_publish_requires_handle.sql — 공개(공개 설정)에 @handle 필수.
--   핸들 없이 공개하면 둘러보기엔 뜨지만 작성자가 사람 검색·프로필 이동에서 빠져(handle is not null 게이트)
--   식별·이동이 안 된다. 공개 전 handle을 강제해 공개 작성자는 항상 식별·검색 가능하게 한다.
--   set_box_visibility 재정의(create or replace) — 재실행 안전. 코드 배포 전 대시보드에서 먼저 실행.
create or replace function set_box_visibility(p_box_id uuid, p_public boolean, p_tags text[] default '{}'::text[])
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception '로그인이 필요해요'; end if;
  if not exists (select 1 from box_participants where box_id = p_box_id and user_id = v_uid) then
    raise exception '참여자만 공개할 수 있어요';
  end if;
  if p_public then
    if not exists (select 1 from profiles where id = v_uid and handle is not null and handle <> '') then
      raise exception '공개하려면 아이디(@handle)를 먼저 설정해주세요';
    end if;
    update boxes set visibility = 'public', published_by = v_uid, published_at = now(),
      tags = coalesce(p_tags, '{}') where id = p_box_id;
  else
    update boxes set visibility = 'private', published_by = null, published_at = null, tags = '{}'
      where id = p_box_id;
  end if;
end;
$$;
