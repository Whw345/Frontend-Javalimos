-- Course administration: score ranking and students assigned by email, including
-- people without an account yet. Run once after 202610300005_teachers.sql.
create table public.course_invites (
  course_id uuid references public.courses on delete cascade,
  email text check (email = lower(email)),
  created_at timestamptz not null default now(),
  primary key (course_id, email)
);
alter table public.course_invites enable row level security;
revoke all on public.course_invites from anon, authenticated;
grant all on public.course_invites to service_role;

create function public.course_leaderboard(p_course uuid) returns jsonb
language sql stable security invoker set search_path = public as $$
  with scores as (
    select u.id, u.name, coalesce(sum(s.points), 0)::integer as points,
      (count(s.id) filter (where s.answered_at is not null))::integer as played
    from course_members m
    join "user" u on u.id = m.user_id
    left join challenge_sessions s on s.course_id = m.course_id and s.user_id = m.user_id
    where m.course_id = p_course and m.role = 'student'
    group by u.id, u.name
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'userId', id, 'name', name, 'points', points, 'played', played, 'rank', position
    ) order by position, name), '[]'::jsonb)
  from (select *, rank() over (order by points desc) as position from scores) ranked;
$$;

create function public.course_roster(p_course uuid) returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(student order by student->>'email'), '[]'::jsonb) from (
    select jsonb_build_object('email', u.email, 'name', u.name, 'pending', false) as student
      from course_members m join "user" u on u.id = m.user_id
      where m.course_id = p_course and m.role = 'student'
    union all
    select jsonb_build_object('email', i.email, 'name', null, 'pending', true)
      from course_invites i where i.course_id = p_course
  ) roster;
$$;

-- Existing accounts join now; the rest wait in course_invites until they sign up.
-- A teacher of the course keeps that role: the conflict leaves the row untouched.
create function public.assign_course_students(p_course uuid, p_emails text[]) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare enrolled integer; invited integer;
begin
  insert into course_members(course_id, user_id, role)
    select p_course, u.id, 'student' from "user" u where lower(u.email) = any(p_emails)
    on conflict (course_id, user_id) do nothing;
  get diagnostics enrolled = row_count;
  insert into course_invites(course_id, email)
    select p_course, address from unnest(p_emails) address
    where not exists(select 1 from "user" u where lower(u.email) = address)
    on conflict (course_id, email) do nothing;
  get diagnostics invited = row_count;
  return jsonb_build_object('enrolled', enrolled, 'invited', invited);
end;
$$;

-- Their sessions stay: assigning them again brings their points back.
create function public.remove_course_student(p_course uuid, p_email text) returns boolean
language plpgsql security invoker set search_path = public as $$
begin
  delete from course_invites where course_id = p_course and email = p_email;
  delete from course_members m using "user" u
    where m.course_id = p_course and m.user_id = u.id and m.role = 'student' and lower(u.email) = p_email;
  return true;
end;
$$;

-- Runs for every sign-up, with password or Google. Better Auth writes to "user" directly.
create function public.claim_course_invites() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into course_members(course_id, user_id, role)
    select course_id, new.id, 'student' from course_invites where email = lower(new.email)
    on conflict (course_id, user_id) do nothing;
  delete from course_invites where email = lower(new.email);
  return new;
end;
$$;
create trigger claim_course_invites after insert on public."user"
  for each row execute function public.claim_course_invites();

revoke all on function public.course_leaderboard(uuid), public.course_roster(uuid),
  public.assign_course_students(uuid, text[]), public.remove_course_student(uuid, text),
  public.claim_course_invites() from public, anon, authenticated;
grant execute on function public.course_leaderboard(uuid), public.course_roster(uuid),
  public.assign_course_students(uuid, text[]), public.remove_course_student(uuid, text) to service_role;
