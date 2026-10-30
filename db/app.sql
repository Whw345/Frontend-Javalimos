-- Run after db/better-auth.sql.
-- teacher and student point to "user" instead of "account": a person has one
-- user but one account per login method, and the session only knows the user.
create table organization (
  id int generated always as identity primary key,
  name text not null,
  -- SHA-256 in hex, so a database leak doesn't reveal the keys.
  api_key_hash text not null unique,
  registered_at timestamptz not null default now()
);

-- Deleting an organization deletes its teachers, and with them their courses,
-- each course's games and its enrolled students. Users and students remain.
create table teacher (
  id int generated always as identity primary key,
  user_id text not null unique references "user" (id) on delete cascade,
  organization_id int not null references organization (id) on delete cascade,
  course_limit int not null check (course_limit >= 0)
);

create table student (
  id int generated always as identity primary key,
  user_id text not null unique references "user" (id) on delete cascade
);

create table course (
  id int generated always as identity primary key,
  name text not null,
  teacher_id int not null references teacher (id) on delete cascade,
  description text not null
);

create table course_student (
  id int generated always as identity primary key,
  course_id int not null references course (id) on delete cascade,
  student_id int not null references student (id) on delete cascade,
  latest_finished_game int,
  points int not null default 0,
  unique (course_id, student_id)
);

create table course_game (
  id int generated always as identity primary key,
  course_id int not null references course (id) on delete cascade,
  game int not null,
  arguments jsonb not null default '{}',
  due_date date not null
);

create index teacher_organization_id_idx on teacher (organization_id);

create index course_teacher_id_idx on course (teacher_id);

create index course_student_student_id_idx on course_student (student_id);

create index course_game_course_id_idx on course_game (course_id);

-- Every sign-up is a student. A trigger creates both rows in one transaction, so
-- email and Google sign-ups can never leave a user without a student.
create function create_student_for_user() returns trigger language plpgsql as $$
begin
  insert into student (user_id) values (new.id);
  return new;
end;
$$;

create trigger user_created_student after insert on "user" for each row execute function create_student_for_user();

insert into student (user_id) select id from "user";

-- Only the server reaches these tables, with the secret key. Supabase no longer
-- grants new public tables to its API roles, so service_role needs this grant.
grant select, insert, update, delete on teacher, student, course, course_student, course_game to service_role;

-- The app only looks organizations up. They are created and deleted in SQL.
grant select on organization to service_role;

-- Teachers look up students by email and show their names. Only these columns
-- are granted, and the rest of the auth tables stay out of reach.
grant select (id, name, email, image) on "user" to service_role;

-- RLS with no policies keeps the tables closed if anon or authenticated are
-- ever granted access. The secret key bypasses it.
alter table organization enable row level security;

alter table teacher enable row level security;

alter table student enable row level security;

alter table course enable row level security;

alter table course_student enable row level security;

alter table course_game enable row level security;
