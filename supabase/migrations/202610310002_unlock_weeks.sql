-- A teacher can open a future week ahead of its date. It plays alongside the active week: its
-- deadline stays and its 10 challenges are its own, so the calendar of the course does not move.
-- Apply it right before deploying: the app reads course_weeks.unlocked_at from now on.
-- Run once after 202610310001_soft_delete_courses.sql.
alter table public.course_weeks add column unlocked_at timestamptz;

-- A leftover unlocked_at means nothing once the calendar reaches that week.
create function public.course_open_weeks(p_course uuid) returns setof integer
language sql stable security invoker set search_path = public as $$
  select course_active_week(p_course)
  union
  select week_number from course_weeks
    where course_id = p_course and unlocked_at is not null and week_number > course_active_week(p_course);
$$;

create or replace function public.course_progress(p_course uuid, p_user text) returns jsonb
language sql security invoker set search_path = public as $$
  with open_weeks as (select course_open_weeks(p_course) as week_number)
  select jsonb_build_object(
    'points', coalesce(sum(s.points), 0),
    'streakDays', 0,
    'weeklyPlayed', count(s.id) filter (
      where s.week_number in (select week_number from open_weeks) and g.status = 'published'),
    'weeklyLimit', (
      select coalesce(sum(least(10, week.total)), 0) from (
        select count(*) as total from generated_challenges published
        where published.course_id = c.id and published.status = 'published'
          and published.week_number in (select week_number from open_weeks)
        group by published.week_number) week))
  from courses c
  left join challenge_sessions s on s.course_id = c.id and s.user_id = p_user
  left join generated_challenges g on g.id = s.challenge_id
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
  -- The week is only known once the challenge is chosen, so the lock cannot depend on it.
  perform pg_advisory_xact_lock(hashtextextended(p_course::text || p_user, 0));
  -- Only an unlocked week can be ahead of the active one, and unlocking skips its opening date.
  select * into selected from generated_challenges g where g.course_id = p_course
    and g.week_number in (select course_open_weeks(p_course))
    and g.status = 'published' and g.game = p_game and g.difficulty = p_difficulty
    and (p_challenge is null or g.id = p_challenge)
    and (g.opens_at is null or g.opens_at <= clock_timestamp() or g.week_number > active_week)
    and (g.deadline is null or g.deadline > clock_timestamp())
    and not exists(select 1 from challenge_sessions s where s.user_id = p_user and s.challenge_id = g.id)
    order by g.week_number, g.created_at limit 1;
  select count(*) into played from challenge_sessions where course_id = p_course and user_id = p_user
    and week_number = coalesce(selected.week_number, active_week);
  if played >= 10 then raise exception 'WEEKLY_LIMIT_REACHED'; end if;
  if selected.id is null then raise exception 'NO_CHALLENGE'; end if;
  insert into challenge_sessions(user_id, course_id, week_number, challenge_id, deadline)
    values(p_user, p_course, selected.week_number, selected.id,
      clock_timestamp() + make_interval(secs => selected.time_limit_seconds))
    returning * into started;
  return to_jsonb(started);
end;
$$;

revoke all on function public.course_open_weeks(uuid) from public, anon, authenticated;
grant execute on function public.course_open_weeks(uuid) to service_role;
