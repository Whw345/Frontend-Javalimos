-- Better Auth replaces Supabase Auth. Run once after 202610300001_learning_pipeline.sql.
-- Rows that point to auth.users must be removed first: Better Auth ids are not Supabase ids.
create table if not exists "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);
create table if not exists "session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);
create table if not exists "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);
create table if not exists "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);
create index if not exists "session_userId_idx" on "session" ("userId");
create index if not exists "account_userId_idx" on "account" ("userId");
create index if not exists "verification_identifier_idx" on "verification" ("identifier");

-- Supabase exposes the public schema through its Data API. Without RLS, anyone
-- with the publishable key could read password hashes and session tokens.
-- better-auth connects as the table owner, so it isn't affected.
alter table "user" enable row level security;
alter table "session" enable row level security;
alter table "account" enable row level security;
alter table "verification" enable row level security;

alter table public.course_members drop constraint course_members_user_id_fkey,
  alter column user_id type text,
  add foreign key (user_id) references public."user" on delete cascade;
alter table public.course_documents drop constraint course_documents_uploaded_by_fkey,
  alter column uploaded_by type text,
  add foreign key (uploaded_by) references public."user";
alter table public.challenge_sessions drop constraint challenge_sessions_user_id_fkey,
  alter column user_id type text,
  add foreign key (user_id) references public."user";

drop function public.course_progress(text, uuid);
drop function public.start_challenge(text, uuid, text, integer, uuid);
drop function public.reveal_session_hint(uuid, uuid);
drop function public.finish_challenge(uuid, uuid, boolean, jsonb);

create function public.course_progress(p_course text, p_user text) returns jsonb
language sql security invoker set search_path = public as $$
  select jsonb_build_object(
    'points', coalesce(sum(s.points), 0),
    'streakDays', 0,
    'weeklyPlayed', count(s.id) filter (where s.week_number = c.current_week),
    'weeklyLimit', 10)
  from courses c left join challenge_sessions s on s.course_id = c.id and s.user_id = p_user
  where c.id = p_course group by c.current_week;
$$;

create function public.start_challenge(p_course text, p_user text, p_game text, p_difficulty integer, p_challenge uuid default null)
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
  perform pg_advisory_xact_lock(hashtextextended(p_course || p_user || active_week::text, 0));
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

create function public.reveal_session_hint(p_session uuid, p_user text) returns jsonb
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

create function public.finish_challenge(p_session uuid, p_user text, p_correct boolean, p_answer jsonb) returns jsonb
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

revoke all on function public.course_progress(text, text), public.start_challenge(text, text, text, integer, uuid),
  public.reveal_session_hint(uuid, text), public.finish_challenge(uuid, text, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.course_progress(text, text), public.start_challenge(text, text, text, integer, uuid),
  public.reveal_session_hint(uuid, text), public.finish_challenge(uuid, text, boolean, jsonb) to service_role;
