-- 005_option_images.sql — 선택지 사진 첨부 (톡게시판 불편 ④ 해결)
-- 선택지에 이미지 URL 배열 + 저장 버킷/정책. RN 이식 위해 URL만 저장.
-- 여러 번 실행해도 안전(idempotent).

-- 1) options.images (URL 배열)
alter table options add column if not exists images jsonb not null default '[]';

-- 2) 사진 저장 버킷 (public read)
insert into storage.buckets (id, name, public)
values ('option-images', 'option-images', true)
on conflict (id) do nothing;

-- 3) 스토리지 RLS — 공개 읽기 + 인증 유저 쓰기
drop policy if exists "option-images read" on storage.objects;
create policy "option-images read" on storage.objects
  for select using (bucket_id = 'option-images');

drop policy if exists "option-images insert" on storage.objects;
create policy "option-images insert" on storage.objects
  for insert with check (bucket_id = 'option-images' and auth.uid() is not null);

drop policy if exists "option-images update" on storage.objects;
create policy "option-images update" on storage.objects
  for update using (bucket_id = 'option-images' and auth.uid() is not null);

drop policy if exists "option-images delete" on storage.objects;
create policy "option-images delete" on storage.objects
  for delete using (bucket_id = 'option-images' and auth.uid() is not null);
