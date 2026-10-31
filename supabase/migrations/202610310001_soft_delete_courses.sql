-- Courses are archived instead of physically deleted. Child data remains recoverable.
alter table public.courses
  add column archived_at timestamptz,
  add column archived_by uuid;

create index courses_active_idx on public.courses(created_at desc)
  where archived_at is null;
