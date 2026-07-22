-- 006_option_content.sql — 선택지 본문 "블록-라이트" 모델 (사진·글·라벨링크 자유 배치)
-- 기존 summary·memo·images·links 4개 필드를 순서 있는 블록 배열(content)로 통합.
-- 블록: {type:'text',id,text} | {type:'image',id,url} | {type:'link',id,label,url}
--
-- 재실행 안전(idempotent): content를 채우면서 원본 4개 컬럼 데이터를 같은 UPDATE로 즉시 비운다.
--   → 재실행 시 옮길 원본이 없어 어떤 행도 다시 백필되지 않는다.
--   → 사용자가 나중에 본문을 모두 지워 content='[]'가 돼도, 원본이 이미 비어 있어 되살아나지 않는다.
-- 컬럼 자체는 드롭하지 않는다(스키마 안정). 데이터만 content로 이관하는 것이라,
-- 롤백이 필요하면 실행 전 options 테이블을 백업할 것.

-- 1) content 컬럼 추가 (상수 default라 테이블 rewrite 없음)
alter table options add column if not exists content jsonb not null default '[]'::jsonb;

-- 2) 원본 4개 컬럼 → 블록 백필 + 원본 소거 (한 UPDATE로 원자적)
--    순서: 요약 항목들(order 순) → 메모 → 사진들 → 링크들
--    대상: content가 아직 비어 있고(= 미이관) 옮길 원본 데이터가 하나라도 있는 행.
update options o
set
  content = (
    -- 요약 항목 → text 블록
    coalesce((
      select jsonb_agg(
        jsonb_build_object('type', 'text', 'id', gen_random_uuid()::text, 'text', e->>'text')
        order by (e->>'order')::int
      )
      from jsonb_array_elements(coalesce(o.summary, '[]'::jsonb)) e
      where coalesce(e->>'text', '') <> ''
    ), '[]'::jsonb)
    ||
    -- 메모 → text 블록 (있을 때만)
    case
      when coalesce(btrim(o.memo), '') <> '' then
        jsonb_build_array(jsonb_build_object('type', 'text', 'id', gen_random_uuid()::text, 'text', o.memo))
      else '[]'::jsonb
    end
    ||
    -- 사진 URL → image 블록
    coalesce((
      select jsonb_agg(jsonb_build_object('type', 'image', 'id', gen_random_uuid()::text, 'url', img))
      from jsonb_array_elements_text(coalesce(o.images, '[]'::jsonb)) img
      where coalesce(img, '') <> ''
    ), '[]'::jsonb)
    ||
    -- 링크 URL → link 블록 (라벨은 빈 문자열)
    coalesce((
      select jsonb_agg(jsonb_build_object('type', 'link', 'id', gen_random_uuid()::text, 'label', '', 'url', lnk))
      from jsonb_array_elements_text(coalesce(o.links, '[]'::jsonb)) lnk
      where coalesce(lnk, '') <> ''
    ), '[]'::jsonb)
  ),
  -- 원본 소거 → 재실행 안전(옮길 원본이 없어 재백필 불가)
  summary = '[]'::jsonb,
  memo = null,
  images = '[]'::jsonb,
  links = '[]'::jsonb
where o.content = '[]'::jsonb
  and (
    coalesce(o.summary, '[]'::jsonb) <> '[]'::jsonb
    or coalesce(btrim(o.memo), '') <> ''
    or coalesce(o.images, '[]'::jsonb) <> '[]'::jsonb
    or coalesce(o.links, '[]'::jsonb) <> '[]'::jsonb
  );
