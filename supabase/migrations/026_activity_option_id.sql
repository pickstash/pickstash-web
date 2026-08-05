-- 026: box_activities.meta에 option_id 추가 (알림함 → 그 선택지 상세까지 딥링크)
-- 알림함 항목 탭 시 상자뿐 아니라 그 댓글이 달린 '선택지 상세'로 바로 가려면 option_id가 필요.
-- option_added·vote_cast·comment_added 3종 트리거가 meta에 option_id를 함께 기록하도록 갱신.
-- 재실행 안전(create or replace). 기존 활동 행은 소급 안 됨(신규 활동부터 option_id 보유).

create or replace function public.log_option_activity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into box_activities (box_id, actor_id, type, meta)
  values (new.box_id, new.created_by, 'option_added',
          jsonb_build_object('option_name', new.name, 'option_id', new.id));
  return new;
end; $$;

create or replace function public.log_vote_activity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_box_id uuid; v_option_name text;
begin
  select box_id, name into v_box_id, v_option_name from options where id = new.option_id;
  insert into box_activities (box_id, actor_id, type, meta)
  values (v_box_id, new.user_id, 'vote_cast',
          jsonb_build_object('option_name', v_option_name, 'vote_type', new.vote_type, 'option_id', new.option_id));
  return new;
end; $$;

create or replace function public.log_comment_activity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_box_id uuid; v_option_name text;
begin
  select box_id, name into v_box_id, v_option_name from options where id = new.option_id;
  insert into box_activities (box_id, actor_id, type, meta)
  values (v_box_id, new.user_id, 'comment_added',
          jsonb_build_object('option_name', v_option_name, 'option_id', new.option_id));
  return new;
end; $$;
