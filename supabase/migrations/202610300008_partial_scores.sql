-- A mistake no longer means 0: the score is the fraction of the challenge solved, and a hint
-- caps it at 5 points. Apply it right before deploying: the app calls finish_challenge with
-- p_score from now on. Run once after 202610300007_first_week_open.sql.
alter table public.challenge_sessions
  drop constraint challenge_sessions_points_check,
  add constraint challenge_sessions_points_check check (points between 0 and 10);

drop function public.finish_challenge(uuid, text, boolean, jsonb);

-- The client submits what it has when time runs out, so that answer arrives just after the
-- deadline and still counts. Three seconds later nothing does.
create function public.finish_challenge(p_session uuid, p_user text, p_score numeric, p_answer jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare current_session challenge_sessions; timed_out boolean; late boolean; earned integer; valid boolean;
begin
  select * into current_session from challenge_sessions where id = p_session and user_id = p_user for update;
  if current_session.id is null or current_session.answered_at is not null then raise exception 'ALREADY_ANSWERED'; end if;
  timed_out := clock_timestamp() > current_session.deadline;
  late := clock_timestamp() > current_session.deadline + interval '3 seconds';
  valid := p_score >= 1 and not late;
  earned := case when late then 0
    else round(p_score * case when current_session.hint_used then 5 else 10 end)::integer end;
  update challenge_sessions set answered_at = clock_timestamp(), answer = p_answer, correct = valid, points = earned where id = p_session;
  return jsonb_build_object('correct', valid, 'pointsAwarded', earned, 'timedOut', timed_out);
end;
$$;

revoke all on function public.finish_challenge(uuid, text, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.finish_challenge(uuid, text, numeric, jsonb) to service_role;
