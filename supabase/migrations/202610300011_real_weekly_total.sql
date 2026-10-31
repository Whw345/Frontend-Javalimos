-- The quota read "2 de 10" on a week with 6 challenges, so it could never fill. It now counts
-- what the week really has, up to the 10 that start_challenge still enforces. Attempts at
-- discarded challenges no longer count towards it. Safe to run before or after deploying.
-- Run once after 202610300010_reset_student_progress.sql.
create or replace function public.course_progress(p_course uuid, p_user text) returns jsonb
language sql security invoker set search_path = public as $$
  select jsonb_build_object(
    'points', coalesce(sum(s.points), 0),
    'streakDays', 0,
    'weeklyPlayed', count(s.id) filter (where s.week_number = course_active_week(c.id) and g.status = 'published'),
    'weeklyLimit', least(10, (
      select count(*) from generated_challenges published
      where published.course_id = c.id and published.status = 'published'
        and published.week_number = course_active_week(c.id))))
  from courses c
  left join challenge_sessions s on s.course_id = c.id and s.user_id = p_user
  left join generated_challenges g on g.id = s.challenge_id
  where c.id = p_course group by c.id;
$$;
