-- Public sign-up creates students. Only accounts listed here can create courses, and the
-- list changes from SQL: nothing in the app or the browser can add to it.
-- Run once after 202610300004_teacher_flow.sql.
create table public.teachers (
  user_id text primary key references public."user" on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.teachers enable row level security;
revoke all on public.teachers from anon, authenticated;
grant all on public.teachers to service_role;

-- Whoever already teaches a course keeps that ability.
insert into public.teachers(user_id)
  select distinct user_id from public.course_members where role = 'teacher';

create or replace function public.create_course(p_name text, p_user text, p_starts_on date) returns uuid
language plpgsql security invoker set search_path = public as $$
declare created uuid;
begin
  if not exists(select 1 from teachers where user_id = p_user) then raise exception 'NOT_A_TEACHER'; end if;
  insert into courses(name, starts_on) values (p_name, p_starts_on) returning id into created;
  insert into course_members(course_id, user_id, role) values (created, p_user, 'teacher');
  return created;
end;
$$;
