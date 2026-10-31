-- Teacher flow: courses created from the app, PDFs assigned directly to a week and
-- generation by week. Run once after 202610300003_drop_legacy_tables.sql.
alter table public.courses
  add column starts_on date,
  add column created_at timestamptz not null default now(),
  add column setup_completed_at timestamptz;

-- A week now comes from the PDF the teacher tagged (S1, S2…), so a syllabus is optional.
alter table public.course_weeks
  alter column syllabus_id drop not null,
  add column generation_status text not null default 'pending'
    check (generation_status in ('pending', 'running', 'done', 'failed')),
  add column generation_started_at timestamptz,
  add column generation_error text;
update public.course_weeks set generation_status = 'done';

-- Only the games last: PDFs are never stored, and the extracted text is deleted on finishing.
alter table public.course_documents
  alter column storage_path drop not null,
  alter column markdown drop not null;

alter table public.generated_challenges
  drop constraint generated_challenges_game_check,
  add constraint generated_challenges_game_check check (game in (
    'desliza', 'parejas', 'ordena', 'dos-cajas', 'hueco',
    'encuentra-error', 'quien-soy', 'intruso', 'cual-mayor', 'explicalo')),
  -- Editable game parameters. payload, solution and hint are rebuilt from them.
  add column content jsonb,
  add column position integer not null default 0,
  add column time_limit_seconds integer not null default 55 check (time_limit_seconds > 0),
  add column opens_at timestamptz,
  add column deadline timestamptz;

-- Dated courses advance by themselves; undated ones keep the explicit current_week.
create function public.course_active_week(p_course uuid) returns integer
language sql stable security invoker set search_path = public as $$
  select case when starts_on is null then current_week else
    least(52, greatest(1, ((now() at time zone 'America/Lima')::date - starts_on) / 7 + 1)) end
  from courses where id = p_course;
$$;

create function public.create_course(p_name text, p_user text, p_starts_on date) returns uuid
language plpgsql security invoker set search_path = public as $$
declare created uuid;
begin
  insert into courses(name, starts_on) values (p_name, p_starts_on) returning id into created;
  insert into course_members(course_id, user_id, role) values (created, p_user, 'teacher');
  return created;
end;
$$;

create function public.attach_document_week(p_course uuid, p_document uuid, p_week integer, p_topic text) returns boolean
language plpgsql security invoker set search_path = public as $$
begin
  if not exists(select 1 from course_documents where id = p_document and course_id = p_course and kind = 'theory') then raise exception 'INVALID_DOCUMENT'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_course::text, 0));
  insert into course_weeks(course_id, week_number, topic, starts_on, confirmed)
    select p_course, p_week, p_topic, c.starts_on + (p_week - 1) * 7, true from courses c where c.id = p_course
    on conflict(course_id, week_number) do update
      set topic = left(course_weeks.topic || ' · ' || excluded.topic, 160), generation_status = 'pending';
  insert into document_weeks(course_id, document_id, week_number) values (p_course, p_document, p_week);
  return true;
end;
$$;

-- A stale claim is reclaimable: an instance can die in the middle of a generation.
create function public.claim_week_generation(p_course uuid, p_week integer) returns boolean
language plpgsql security invoker set search_path = public as $$
begin
  update course_weeks set generation_status = 'running', generation_started_at = now(), generation_error = null
    where course_id = p_course and week_number = p_week
      and (generation_status <> 'running' or generation_started_at < now() - interval '5 minutes');
  return found;
end;
$$;

create function public.save_week_games(p_course uuid, p_week integer, p_games jsonb) returns integer
language plpgsql security invoker set search_path = public as $$
declare saved integer;
begin
  delete from generated_challenges where course_id = p_course and week_number = p_week and status = 'draft';
  insert into generated_challenges(course_id, week_number, game, difficulty, payload, solution, hint, explanation,
      source, source_document_id, evidence, decision, content, position, time_limit_seconds, opens_at, deadline)
    select p_course, p_week, g.game, g.difficulty, g.payload, g.solution, g.hint, g.explanation,
      g.source, g.source_document_id, g.evidence, g.decision, g.content, g.position, g.time_limit_seconds, g.opens_at, g.deadline
    from jsonb_populate_recordset(null::generated_challenges, p_games) g;
  get diagnostics saved = row_count;
  update course_weeks set generation_status = 'done', generation_error = null
    where course_id = p_course and week_number = p_week;
  return saved;
end;
$$;

create function public.finish_course_setup(p_course uuid) returns integer
language plpgsql security invoker set search_path = public as $$
declare published integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_course::text, 0));
  if exists(select 1 from course_weeks where course_id = p_course and generation_status in ('pending', 'running')) then
    raise exception 'GENERATION_PENDING';
  end if;
  update generated_challenges set status = 'published' where course_id = p_course and status = 'draft';
  get diagnostics published = row_count;
  if published = 0 then raise exception 'NO_GAMES'; end if;
  update course_documents set markdown = null where course_id = p_course;
  update courses set setup_completed_at = now() where id = p_course;
  return published;
end;
$$;

create or replace function public.course_progress(p_course uuid, p_user text) returns jsonb
language sql security invoker set search_path = public as $$
  select jsonb_build_object(
    'points', coalesce(sum(s.points), 0),
    'streakDays', 0,
    'weeklyPlayed', count(s.id) filter (where s.week_number = course_active_week(c.id)),
    'weeklyLimit', 10)
  from courses c left join challenge_sessions s on s.course_id = c.id and s.user_id = p_user
  where c.id = p_course group by c.id;
$$;

create or replace function public.start_challenge(p_course uuid, p_user text, p_game text, p_difficulty integer, p_challenge uuid default null)
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
  active_week := course_active_week(p_course);
  perform pg_advisory_xact_lock(hashtextextended(p_course::text || p_user || active_week::text, 0));
  select count(*) into played from challenge_sessions where course_id = p_course and user_id = p_user and week_number = active_week;
  if played >= 10 then raise exception 'WEEKLY_LIMIT_REACHED'; end if;
  select * into selected from generated_challenges g where g.course_id = p_course
    and g.week_number = active_week and g.status = 'published' and g.game = p_game and g.difficulty = p_difficulty
    and (p_challenge is null or g.id = p_challenge)
    and (g.opens_at is null or g.opens_at <= clock_timestamp())
    and (g.deadline is null or g.deadline > clock_timestamp())
    and not exists(select 1 from challenge_sessions s where s.user_id = p_user and s.challenge_id = g.id)
    order by g.created_at limit 1;
  if selected.id is null then raise exception 'NO_CHALLENGE'; end if;
  insert into challenge_sessions(user_id, course_id, week_number, challenge_id, deadline)
    values(p_user, p_course, active_week, selected.id,
      clock_timestamp() + make_interval(secs => selected.time_limit_seconds))
    returning * into started;
  return to_jsonb(started);
end;
$$;

revoke all on function public.course_active_week(uuid), public.create_course(text, text, date),
  public.attach_document_week(uuid, uuid, integer, text), public.claim_week_generation(uuid, integer),
  public.save_week_games(uuid, integer, jsonb), public.finish_course_setup(uuid) from public, anon, authenticated;
grant execute on function public.course_active_week(uuid), public.create_course(text, text, date),
  public.attach_document_week(uuid, uuid, integer, text), public.claim_week_generation(uuid, integer),
  public.save_week_games(uuid, integer, jsonb), public.finish_course_setup(uuid) to service_role;
