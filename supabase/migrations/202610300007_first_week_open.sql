-- Week 1 opens as soon as it is published: course_active_week already reports it before the
-- first Monday, so students were told "Semana 1" and could not play. Its deadline stays.
-- Run once after 202610300006_course_admin.sql.
update public.generated_challenges set opens_at = null where week_number = 1;
