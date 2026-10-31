-- Removes the schema of the previous app (db/app.sql), which no code uses anymore.
-- Run once after 202610300002_better_auth.sql. Safe where that schema never existed.
-- The trigger goes first: it would make every sign-up fail once student is gone.
drop trigger if exists user_created_student on "user";
drop function if exists public.create_student_for_user();

-- Children first and without cascade, so an unexpected dependency stops the migration.
drop table if exists public.course_game;
drop table if exists public.course_student;
drop table if exists public.course;
drop table if exists public.student;
drop table if exists public.teacher;
drop table if exists public.organization;
