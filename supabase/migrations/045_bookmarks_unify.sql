-- 044_bookmarks_unify.sql — 즐겨찾기(favorites) 개념을 북마크(bookmarks)로 일원화.
-- 두 테이블은 (user_id, box_id, created_at)로 스키마 동일. 이후 코드는 favorites를 안 읽는다.
-- 재실행 안전(idempotent). favorites 테이블은 여기서 drop하지 않는다(라이브 데이터 보존 → 차기 정리 마이그레이션에서 제거).

-- 1) 기존 즐겨찾기(별표) 행을 북마크로 이관. 중복(이미 북마크한 상자)은 건너뛴다.
insert into bookmarks (user_id, box_id, created_at)
select user_id, box_id, created_at from favorites
on conflict (user_id, box_id) do nothing;

-- 2) 저장함 RPC — 카드별 is_member(내가 참여 중인 상자인지) 플래그 추가.
--    저장함은 이제 "참여 중 상자 + 남의 공개 상자"가 섞이므로, 클라이언트가
--    is_member=true면 /box/:id(전체 기능), false면 /p/:id(공개 뷰어)로 라우팅한다.
--    security definer라 참여 여부·비공개 상자 조회 모두 문제없다.
create or replace function get_my_bookmarks()
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(
      public_box_card(b) || jsonb_build_object(
        'is_member', exists (select 1 from box_participants bp where bp.box_id = b.id and bp.user_id = v_uid)
      )
      order by bm.created_at desc
    )
    from bookmarks bm join boxes b on b.id = bm.box_id
    where bm.user_id = v_uid
  ), '[]'::jsonb);
end; $$;

grant execute on function get_my_bookmarks() to authenticated;
