-- Taskit 0.21.0: minimum app version.
-- Run once in Supabase → SQL Editor → New query → Run, after teams-0.20.sql. Safe to run again.
-- Everything runs as one step: if any line fails, nothing changes.
--
-- What it does:
--   1. Adds a small settings table with the team's minimum app version. Every member's app can read it;
--      nobody can change it from the app. It's set here in the SQL Editor (see the lines at the bottom).
--   2. From then on Supabase refuses task, profile and automation changes from an app older than
--      that minimum. Taskit 0.21.0 and later send their version with every request and show a
--      lock screen asking to update. Older apps just show "Not syncing" until they update.
--
-- Safe while PCs are still on older versions: no minimum is set by this file, so nothing is
-- refused until a minimum is set. Clearing the minimum (setting it to empty) turns the check off.
begin;

-- 1. The settings table: one row per workspace.
create table if not exists public.app_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  min_version  text check (min_version is null or min_version ~ '^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$'),
  updated_at   timestamptz not null default now(),
  updated_by   uuid default auth.uid() references auth.users(id) on delete set null
);
insert into public.app_settings (workspace_id) select w.id from public.workspaces w on conflict do nothing;

alter table public.app_settings enable row level security;
drop policy if exists "App settings: members read" on public.app_settings;
drop policy if exists "App settings: owner adds" on public.app_settings;
drop policy if exists "App settings: owner changes" on public.app_settings;
create policy "App settings: members read" on public.app_settings for select to authenticated
  using ((select public.is_member(workspace_id)));
-- No add, change or delete rules: only the SQL Editor (which skips these rules) can change it.
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to authenticated;

-- Supabase stamps when the minimum was changed.
create or replace function public.app_settings_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if (select auth.uid()) is not null then new.updated_by := (select auth.uid()); end if;
  return new;
end $$;
drop trigger if exists app_settings_touch on public.app_settings;
create trigger app_settings_touch before insert or update on public.app_settings
for each row execute function public.app_settings_touch();

-- Open apps learn about a new minimum straight away.
do $$ begin alter publication supabase_realtime add table public.app_settings; exception when duplicate_object then null; end $$;

-- 2. The version check.
-- "0.21.0" → {0,21,0}, so versions compare number by number (0.21.10 is newer than 0.21.9).
create or replace function public.version_parts(v text) returns int[]
language sql immutable set search_path = '' as $$
  select case when v ~ '^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$' then string_to_array(v, '.')::int[] end $$;

-- True when the signed-in person's app is older than their team's minimum.
-- The app sends its version in the x-taskit-version header; apps before 0.21.0 send none.
create or replace function public.app_too_old() returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  floor_v text;
  mine int[];
begin
  if me is null then return false; end if;  -- the service role and SQL Editor are never blocked
  select max(s.min_version) into floor_v  -- one team, so at most one value
    from public.app_settings s join public.members m on m.workspace_id = s.workspace_id
   where m.user_id = me and s.min_version is not null;
  if floor_v is null then return false; end if;
  mine := public.version_parts(nullif(current_setting('request.headers', true), '')::json ->> 'x-taskit-version');
  return mine is null or mine < public.version_parts(floor_v);
end $$;
revoke all on function public.app_too_old() from public, anon;
grant execute on function public.app_too_old() to authenticated;

create or replace function public.refuse_old_app() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.app_too_old() then
    raise exception 'This version of Taskit is too old. Update Taskit to keep syncing.'
      using errcode = 'TKVER', hint = 'update-required';
  end if;
  return coalesce(new, old);
end $$;
revoke all on function public.refuse_old_app() from public, anon, authenticated;

drop trigger if exists refuse_old_app on public.records;
create trigger refuse_old_app before insert or update or delete on public.records
for each row execute function public.refuse_old_app();
drop trigger if exists refuse_old_app on public.profiles;
create trigger refuse_old_app before insert or update or delete on public.profiles
for each row execute function public.refuse_old_app();
drop trigger if exists refuse_old_app on public.automation_runs;
create trigger refuse_old_app before insert or update or delete on public.automation_runs
for each row execute function public.refuse_old_app();

commit;

-- To set or change the minimum (each release that needs it comes with this line):
--   update public.app_settings set min_version = '0.21.0';
-- To turn the check off again:
--   update public.app_settings set min_version = null;
