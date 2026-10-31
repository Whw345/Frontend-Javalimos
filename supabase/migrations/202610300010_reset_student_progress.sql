-- Lets a teacher replay the path as a student would: deletes that student's attempts in one
-- course, and with them their points, weekly quota and played challenges. Membership stays.
-- Run once after 202610300009_remove_free_text.sql.
create function public.reset_course_student(p_course uuid, p_email text) returns integer
language plpgsql security invoker set search_path = public as $$
declare removed integer;
begin
  delete from challenge_sessions s using course_members m, "user" u
    where m.course_id = p_course and m.role = 'student' and m.user_id = u.id and lower(u.email) = p_email
      and s.course_id = p_course and s.user_id = m.user_id;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.reset_course_student(uuid, text) from public, anon, authenticated;
grant execute on function public.reset_course_student(uuid, text) to service_role;
