-- Tasks 0.20.3: clear out old sync leftovers. Run once in the Supabase SQL Editor, after
-- teams-0.20.sql and delete-rules-0.20.3.sql. Safe to run again.
--
-- When a task is deleted, its row stays in `records` marked as deleted, so every PC hears about
-- it. Nothing ever removed those markers, nor the notes in `automation_runs` about which PC ran
-- which automation. This adds a daily job that removes the ones older than 90 days.
-- It never touches a task that still exists: only rows already marked deleted, and old run notes.
-- A PC that was switched off for longer than that compares everything again when it comes back
-- (Tasks 0.20.3 and later), so it still learns about the deletions.

-- 1. The cleanup itself. Returns how many rows it removed.
create or replace function public.cleanup_sync(keep_days integer default 90)
returns table (records_removed bigint, runs_removed bigint)
language plpgsql security definer set search_path = '' as $$
declare r bigint; a bigint;
begin
  if keep_days is null or keep_days < 30 then raise exception 'keep_days must be 30 or more'; end if;
  delete from public.records where deleted and updated_at < now() - make_interval(days => keep_days);
  get diagnostics r = row_count;
  delete from public.automation_runs where ran_at < now() - make_interval(days => keep_days);
  get diagnostics a = row_count;
  return query select r, a;
end $$;
-- Only the scheduled job (and you, in the SQL Editor) can run it; the app can't.
revoke all on function public.cleanup_sync(integer) from public, anon, authenticated;

-- 2. Run it every night at 03:17 UTC, with Supabase's built-in scheduler (pg_cron).
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'tasks-cleanup';
select cron.schedule('tasks-cleanup', '17 3 * * *', 'select public.cleanup_sync()');

-- To check it: select * from cron.job where jobname = 'tasks-cleanup';
-- To run it once by hand and see the counts: select * from public.cleanup_sync();
