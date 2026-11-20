-- Taskit 0.20 teams: run once in Supabase → SQL Editor → New query → Run, after setup.sql.
-- Safe to run again. It turns your one-person cloud into one shared team workspace.
-- Everything runs as one step: if any line fails, nothing changes.
begin;

-- 1. The workspace, its members, the invite list, and a claim table for time-based automations.
create table if not exists public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Team',
  owner      uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  access       text not null default 'member' check (access in ('owner', 'admin', 'member')),
  job_role     text,
  teams        text[] not null default '{}',
  joined_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists members_user on public.members (user_id);
create table if not exists public.invites (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email        text not null check (email = lower(btrim(email)) and email like '%_@_%'),
  access       text not null default 'member' check (access in ('admin', 'member')),
  job_role     text,
  teams        text[] not null default '{}',
  invited_by   uuid default auth.uid() references auth.users(id) on delete set null,
  invited_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (workspace_id, email)
);
-- One row per time-based automation that fired on a task. The first PC to add the row runs it; the others skip.
create table if not exists public.automation_runs (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id      text not null,
  rule_key     text not null,
  device       text,
  ran_at       timestamptz not null default now(),
  primary key (workspace_id, task_id, rule_key)
);

-- 2. Helpers the security rules use. They read members directly, so rules on members don't loop.
create or replace function public.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.workspace_id = ws and m.user_id = (select auth.uid())) $$;
create or replace function public.is_admin(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.workspace_id = ws and m.user_id = (select auth.uid()) and m.access in ('owner', 'admin')) $$;
-- For storage paths: the first folder is the workspace id as text.
create or replace function public.is_member_folder(folder text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.workspace_id::text = folder and m.user_id = (select auth.uid())) $$;
create or replace function public.shares_workspace(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members a join public.members b on a.workspace_id = b.workspace_id
                 where a.user_id = (select auth.uid()) and b.user_id = other) $$;
revoke all on function public.is_member(uuid), public.is_admin(uuid), public.is_member_folder(text), public.shares_workspace(uuid) from public, anon;
grant execute on function public.is_member(uuid), public.is_admin(uuid), public.is_member_folder(text), public.shares_workspace(uuid) to authenticated;

-- 3. Create the team workspace from your existing data (only the first time), with you as Owner.
do $$
declare ws uuid; me uuid;
begin
  if exists (select 1 from public.workspaces) then return; end if;
  select r.user_id into me from public.records r group by r.user_id order by count(*) desc limit 1;
  if me is null then select p.user_id into me from public.profiles p limit 1; end if;
  if me is null then raise exception 'No existing data found. Sign in to Taskit once before running this.'; end if;
  insert into public.workspaces (name, owner) values ('Team', me) returning id into ws;
  insert into public.members (workspace_id, user_id, access, job_role)
    select ws, me, 'owner', p.role from (select 1) x left join public.profiles p on p.user_id = me;
end $$;

-- 4. Tasks, lists and settings now belong to the workspace. user_id stays as "last edited by".
alter table public.records add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
update public.records set workspace_id = (select w.id from public.workspaces w order by w.created_at limit 1) where workspace_id is null;
alter table public.records alter column workspace_id set not null;
do $$ begin
  if exists (select 1 from information_schema.key_column_usage k where k.table_schema = 'public' and k.table_name = 'records'
             and k.constraint_name = 'records_pkey' and k.column_name = 'user_id') then
    alter table public.records drop constraint records_pkey;
    alter table public.records add constraint records_pkey primary key (workspace_id, store, key);
  end if;
end $$;
-- Deleting a teammate's account must never delete the tasks they last edited.
alter table public.records alter column user_id drop not null;
alter table public.records drop constraint if exists records_user_id_fkey;
alter table public.records add constraint records_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
drop index if exists public.records_user_updated;
create index if not exists records_ws_updated on public.records (workspace_id, updated_at);
-- The server stamps who made each change, so it can't be faked.
create or replace function public.records_editor() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null then new.user_id := (select auth.uid()); end if;
  return new;
end $$;
drop trigger if exists records_editor on public.records;
create trigger records_editor before insert or update on public.records
for each row execute function public.records_editor();

-- 5. Security rules for records: members read and write tasks; only Owner and Admin change team settings.
--    Team settings = statuses, buckets, platforms, automations, teams, column names, shared settings and the workspace list.
create or replace function public.records_admin_only(store text, key text) returns boolean
language sql immutable set search_path = '' as $$
  select store = 'workspaces' or store like 'workspaces:%'
      or key like 'm/%'
      or (key like 'l/%' and key not like 'l/looseDocs/%')
      or key like 'f/%' $$;
drop policy if exists "Own rows" on public.records;
drop policy if exists "Members read" on public.records;
drop policy if exists "Members add" on public.records;
drop policy if exists "Members change" on public.records;
drop policy if exists "Admins remove" on public.records;
create policy "Members read" on public.records for select to authenticated
  using ((select public.is_member(workspace_id)));
create policy "Members add" on public.records for insert to authenticated
  with check ((select public.is_member(workspace_id)) and (not public.records_admin_only(store, key) or (select public.is_admin(workspace_id))));
create policy "Members change" on public.records for update to authenticated
  using ((select public.is_member(workspace_id)) and (not public.records_admin_only(store, key) or (select public.is_admin(workspace_id))))
  with check ((select public.is_member(workspace_id)) and (not public.records_admin_only(store, key) or (select public.is_admin(workspace_id))));
create policy "Admins remove" on public.records for delete to authenticated
  using ((select public.is_admin(workspace_id)));

-- 6. Rules for the new tables.
alter table public.workspaces enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.automation_runs enable row level security;
drop policy if exists "Workspace: read" on public.workspaces;
drop policy if exists "Workspace: rename" on public.workspaces;
create policy "Workspace: read" on public.workspaces for select to authenticated using ((select public.is_member(id)));
create policy "Workspace: rename" on public.workspaces for update to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
drop policy if exists "Members: read" on public.members;
drop policy if exists "Members: admins change" on public.members;
drop policy if exists "Members: admins remove" on public.members;
create policy "Members: read" on public.members for select to authenticated using ((select public.is_member(workspace_id)));
-- Admins change other people's access, role and teams, never their own and never the Owner's. Nobody can make an Owner.
create policy "Members: admins change" on public.members for update to authenticated
  using ((select public.is_admin(workspace_id)) and user_id <> (select auth.uid()) and access <> 'owner')
  with check ((select public.is_admin(workspace_id)) and user_id <> (select auth.uid()) and access <> 'owner');
create policy "Members: admins remove" on public.members for delete to authenticated
  using ((select public.is_admin(workspace_id)) and user_id <> (select auth.uid()) and access <> 'owner');
drop policy if exists "Invites: admins" on public.invites;
create policy "Invites: admins" on public.invites for all to authenticated
  using ((select public.is_admin(workspace_id))) with check ((select public.is_admin(workspace_id)));
drop policy if exists "Automation runs: members read" on public.automation_runs;
create policy "Automation runs: members read" on public.automation_runs for select to authenticated using ((select public.is_member(workspace_id)));
drop policy if exists "Automation runs: members add" on public.automation_runs;
create policy "Automation runs: members add" on public.automation_runs for insert to authenticated with check ((select public.is_member(workspace_id)));
revoke all on public.workspaces, public.members, public.invites, public.automation_runs from anon;
grant select, update on public.workspaces to authenticated;
grant select, update, delete on public.members to authenticated;
grant select, insert, update, delete on public.invites to authenticated;
grant select, insert on public.automation_runs to authenticated;
do $$ begin alter publication supabase_realtime add table public.members; exception when duplicate_object then null; end $$;

-- 7. Joining: on first sign-in the app calls join_workspace(). It uses the invite for the signed-in email.
create or replace function public.join_workspace() returns uuid
language plpgsql security definer set search_path = '' as $$
declare inv public.invites; mine text := lower(btrim((select auth.jwt()) ->> 'email')); ws uuid;
begin
  if (select auth.uid()) is null then raise exception 'Not signed in'; end if;
  select m.workspace_id into ws from public.members m where m.user_id = (select auth.uid()) order by m.joined_at limit 1;
  if ws is not null then return ws; end if;
  select * into inv from public.invites i where i.email = mine and i.accepted_at is null order by i.invited_at limit 1;
  if inv.email is null then raise exception 'This email isn''t invited to Taskit' using errcode = '42501'; end if;
  insert into public.members (workspace_id, user_id, access, job_role, teams)
    values (inv.workspace_id, (select auth.uid()), inv.access, inv.job_role, inv.teams) on conflict do nothing;
  update public.invites set accepted_at = now() where workspace_id = inv.workspace_id and email = inv.email;
  return inv.workspace_id;
end $$;
revoke all on function public.join_workspace() from public, anon;
grant execute on function public.join_workspace() to authenticated;

-- 8. Sign-up gate. Set it in Authentication → Hooks → Before User Created → Postgres → public.gate_signup.
--    New accounts are allowed only for invited emails. Existing accounts are never affected.
create or replace function public.gate_signup(event jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare e text := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));
begin
  if e <> '' and exists (select 1 from public.invites i where i.email = e and i.accepted_at is null) then return '{}'::jsonb; end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403,
    'message', 'This email isn''t invited to Taskit. Ask your team admin to invite it.'));
end $$;
revoke all on function public.gate_signup(jsonb) from public, anon, authenticated;
grant execute on function public.gate_signup(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
grant select on public.invites to supabase_auth_admin;
drop policy if exists "Invites: sign-up gate" on public.invites;
create policy "Invites: sign-up gate" on public.invites for select to supabase_auth_admin using (true);

-- 9. Documents: one folder per workspace. Your old folder stays readable until the app has moved its files.
drop policy if exists "Team documents: read" on storage.objects;
drop policy if exists "Team documents: add" on storage.objects;
drop policy if exists "Team documents: replace" on storage.objects;
drop policy if exists "Team documents: delete" on storage.objects;
create policy "Team documents: read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (select public.is_member_folder((storage.foldername(name))[1])));
create policy "Team documents: add" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (select public.is_member_folder((storage.foldername(name))[1])));
create policy "Team documents: replace" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (select public.is_member_folder((storage.foldername(name))[1])));
create policy "Team documents: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (select public.is_member_folder((storage.foldername(name))[1])));

-- 10. Profiles: visible to people who share a workspace with you. You still change only your own.
drop policy if exists "Profiles: read" on public.profiles;
create policy "Profiles: read" on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.shares_workspace(user_id)));

commit;
