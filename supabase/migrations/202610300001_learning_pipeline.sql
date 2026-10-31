-- This repository had no database schema. Run once using the Supabase SQL editor.
create table public.courses (
  id text primary key,
  name text not null,
  current_week integer not null default 1 check (current_week between 1 and 52)
);
create table public.course_members (
  course_id text references public.courses on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  section text not null default 'A',
  primary key (course_id, user_id)
);
create table public.course_documents (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses on delete cascade,
  uploaded_by uuid not null references auth.users,
  kind text not null check (kind in ('syllabus', 'theory')),
  filename text not null,
  markdown text not null,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  unique (id, course_id)
);
create table public.course_weeks (
  course_id text references public.courses on delete cascade,
  week_number integer check (week_number between 1 and 52),
  topic text not null,
  starts_on date,
  syllabus_id uuid not null,
  confirmed boolean not null default false,
  primary key (course_id, week_number),
  foreign key (syllabus_id, course_id) references public.course_documents(id, course_id)
);
create table public.document_weeks (
  course_id text not null,
  document_id uuid not null,
  week_number integer not null,
  primary key (document_id, week_number),
  foreign key (document_id, course_id) references public.course_documents(id, course_id) on delete cascade,
  foreign key (course_id, week_number) references public.course_weeks on delete cascade
);
create table public.generated_challenges (
  id uuid primary key default gen_random_uuid(),
  course_id text not null,
  week_number integer not null,
  game text not null check (game in ('hueco', 'parejas', 'ordena')),
  difficulty integer not null check (difficulty between 1 and 3),
  payload jsonb not null,
  solution jsonb not null,
  hint jsonb not null,
  explanation text not null,
  source jsonb not null,
  source_document_id uuid not null,
  evidence text not null,
  decision jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'discarded')),
  created_at timestamptz not null default now(),
  foreign key (course_id, week_number) references public.course_weeks,
  foreign key (source_document_id, course_id) references public.course_documents(id, course_id)
);
create table public.challenge_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  course_id text not null references public.courses,
  week_number integer not null,
  challenge_id uuid not null references public.generated_challenges,
  started_at timestamptz not null default now(),
  deadline timestamptz not null,
  hint_used boolean not null default false,
  answered_at timestamptz,
  answer jsonb,
  correct boolean,
  points integer not null default 0 check (points in (0, 5, 10))
);
create index sessions_quota on public.challenge_sessions(user_id, course_id, week_number);
create index published_week on public.generated_challenges(course_id, week_number, status);

-- No browser access to source material, answers or membership administration.
-- Route handlers verify Auth and course membership before using the service role.
alter table public.courses enable row level security;
alter table public.course_members enable row level security;
alter table public.course_documents enable row level security;
alter table public.course_weeks enable row level security;
alter table public.document_weeks enable row level security;
alter table public.generated_challenges enable row level security;
alter table public.challenge_sessions enable row level security;
revoke all on public.courses, public.course_members, public.course_documents, public.course_weeks,
  public.document_weeks, public.generated_challenges, public.challenge_sessions from anon, authenticated;
grant all on public.courses, public.course_members, public.course_documents, public.course_weeks,
  public.document_weeks, public.generated_challenges, public.challenge_sessions to service_role;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('course-materials', 'course-materials', false, 10485760, array['application/pdf']);

create function public.course_progress(p_course text, p_user uuid) returns jsonb
language sql security invoker set search_path = public as $$
  select jsonb_build_object(
    'points', coalesce(sum(s.points), 0),
    'streakDays', 0,
    'weeklyPlayed', count(s.id) filter (where s.week_number = c.current_week),
    'weeklyLimit', 10)
  from courses c left join challenge_sessions s on s.course_id = c.id and s.user_id = p_user
  where c.id = p_course group by c.current_week;
$$;

create function public.confirm_course_weeks(p_course text, p_syllabus uuid, p_weeks jsonb) returns boolean
language plpgsql security invoker set search_path = public as $$
declare item jsonb;
begin
  if not exists(select 1 from course_documents where id = p_syllabus and course_id = p_course and kind = 'syllabus') then raise exception 'INVALID_SYLLABUS'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_course, 0));
  delete from course_weeks where course_id = p_course and week_number not in
    (select (value->>'weekNumber')::integer from jsonb_array_elements(p_weeks));
  for item in select value from jsonb_array_elements(p_weeks) loop
    insert into course_weeks(course_id, week_number, topic, starts_on, syllabus_id, confirmed)
    values(p_course, (item->>'weekNumber')::integer, item->>'topic', (item->>'startsOn')::date, p_syllabus, true)
    on conflict(course_id, week_number) do update set topic = excluded.topic, starts_on = excluded.starts_on,
      syllabus_id = excluded.syllabus_id, confirmed = true;
  end loop;
  return true;
end;
$$;

create function public.assign_document_weeks(p_course text, p_document uuid, p_weeks integer[]) returns boolean
language plpgsql security invoker set search_path = public as $$
begin
  if not exists(select 1 from course_documents where id = p_document and course_id = p_course and kind = 'theory') then raise exception 'INVALID_DOCUMENT'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_document::text, 0));
  delete from document_weeks where document_id = p_document and course_id = p_course;
  insert into document_weeks(course_id, document_id, week_number)
    select p_course, p_document, w from unnest(p_weeks) w;
  return true;
end;
$$;

create function public.start_challenge(p_course text, p_user uuid, p_game text, p_difficulty integer, p_challenge uuid default null)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  active_week integer;
  selected generated_challenges;
  started challenge_sessions;
  played integer;
begin
  if not exists(select 1 from course_members where course_id = p_course and user_id = p_user) then
    raise exception 'FORBIDDEN';
  end if;
  select current_week into active_week from courses where id = p_course;
  perform pg_advisory_xact_lock(hashtextextended(p_course || p_user::text || active_week::text, 0));
  select count(*) into played from challenge_sessions where course_id = p_course and user_id = p_user and week_number = active_week;
  if played >= 10 then raise exception 'WEEKLY_LIMIT_REACHED'; end if;
  select * into selected from generated_challenges g where g.course_id = p_course
    and g.week_number = active_week and g.status = 'published' and g.game = p_game and g.difficulty = p_difficulty
    and (p_challenge is null or g.id = p_challenge)
    and not exists(select 1 from challenge_sessions s where s.user_id = p_user and s.challenge_id = g.id)
    order by g.created_at limit 1;
  if selected.id is null then raise exception 'NO_CHALLENGE'; end if;
  insert into challenge_sessions(user_id, course_id, week_number, challenge_id, deadline)
    values(p_user, p_course, active_week, selected.id, clock_timestamp() +
      case when selected.game = 'hueco' then interval '20 seconds' else interval '55 seconds' end)
    returning * into started;
  return to_jsonb(started);
end;
$$;

create function public.reveal_session_hint(p_session uuid, p_user uuid) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare current_session challenge_sessions; result jsonb;
begin
  select * into current_session from challenge_sessions where id = p_session and user_id = p_user for update;
  if current_session.id is null or current_session.answered_at is not null or clock_timestamp() > current_session.deadline then
    raise exception 'CHALLENGE_EXPIRED';
  end if;
  update challenge_sessions set hint_used = true where id = p_session;
  select hint into result from generated_challenges where id = current_session.challenge_id;
  return result;
end;
$$;

create function public.finish_challenge(p_session uuid, p_user uuid, p_correct boolean, p_answer jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare current_session challenge_sessions; expired boolean; earned integer; valid boolean;
begin
  select * into current_session from challenge_sessions where id = p_session and user_id = p_user for update;
  if current_session.id is null or current_session.answered_at is not null then raise exception 'ALREADY_ANSWERED'; end if;
  expired := clock_timestamp() > current_session.deadline;
  valid := p_correct and not expired;
  earned := case when valid then case when current_session.hint_used then 5 else 10 end else 0 end;
  update challenge_sessions set answered_at = clock_timestamp(), answer = p_answer, correct = valid, points = earned where id = p_session;
  return jsonb_build_object('correct', valid, 'pointsAwarded', earned, 'timedOut', expired);
end;
$$;

revoke all on function public.course_progress(text, uuid), public.start_challenge(text, uuid, text, integer, uuid),
  public.reveal_session_hint(uuid, uuid), public.finish_challenge(uuid, uuid, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.course_progress(text, uuid), public.start_challenge(text, uuid, text, integer, uuid),
  public.reveal_session_hint(uuid, uuid), public.finish_challenge(uuid, uuid, boolean, jsonb) to service_role;
revoke all on function public.confirm_course_weeks(text, uuid, jsonb), public.assign_document_weeks(text, uuid, integer[]) from public, anon, authenticated;
grant execute on function public.confirm_course_weeks(text, uuid, jsonb), public.assign_document_weeks(text, uuid, integer[]) to service_role;
