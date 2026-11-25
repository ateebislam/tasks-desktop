-- Taskit 0.20.3: delete rules for tasks and documents.
-- Run once in Supabase → SQL Editor → New query → Run, after setup.sql and teams-0.20.sql.
-- Safe to run again. Everything runs as one step: if any line fails, nothing changes.
--
-- Until 0.20.3 these rules were only checked inside the app. With this file Supabase checks them too,
-- so they hold even for someone using the API directly:
--   1. Members can delete (move to the Trash) only tasks they made. The Owner and Admins can delete any.
--      Archiving a finished task, restoring a task, and clearing the Trash after 15 days still work for everyone.
--   2. Nobody but the Owner and Admins can change who made a task.
--   3. Only the Owner and Admins can delete or overwrite a document file in the team's storage.
--      Members still add documents, and removing a document from a task still works for everyone.
-- Apps before 0.20.3 keep working; a refused change is simply put back on that PC by 0.20.3.
begin;

-- 1 and 2. Tasks, archived tasks and trashed tasks ('t/', 'a/', 'x/' rows).
create or replace function public.records_guard_tasks() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  maker text := old.value ->> 'createdBy';
  id text := substr(old.key, 3);
begin
  -- The service role (no signed-in user), the Owner and Admins may do anything.
  if me is null or public.is_admin(old.workspace_id) then return new; end if;
  if maker is not null and coalesce(new.value ->> 'createdBy', maker) <> maker then
    raise exception 'Only the Owner and Admins can change who made a task' using errcode = '42501';
  end if;
  -- Deleting a row (it's marked deleted, never removed) that someone else made.
  if new.deleted and not old.deleted and maker is not null and maker <> me::text then
    -- A finished task moving to the Archive.
    if old.key like 't/%' and old.value ->> 'status' = 'done' then return new; end if;
    -- An archived task being restored or moved to the Trash: it's still kept elsewhere.
    if old.key like 'a/%' then return new; end if;
    -- A trashed task being restored (it's back in the list), or cleared after 15 days in the Trash.
    if old.key like 'x/%' and (
         exists (select 1 from public.records r where r.workspace_id = old.workspace_id and r.key = 't/' || id and not r.deleted)
         or coalesce((old.value ->> 'deletedAt')::bigint, 0) < (extract(epoch from now()) * 1000)::bigint - 15 * 86400000::bigint
       ) then return new; end if;
    raise exception 'Only the person who made a task, or the Owner or an Admin, can delete it' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.records_guard_tasks() from public, anon, authenticated;
drop trigger if exists records_guard_tasks on public.records;
create trigger records_guard_tasks before update on public.records
for each row when (old.key ~ '^[tax]/') execute function public.records_guard_tasks();

-- 3. Documents: members add files; only the Owner and Admins delete or overwrite them.
create or replace function public.is_admin_folder(folder text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.workspace_id::text = folder and m.user_id = (select auth.uid()) and m.access in ('owner', 'admin')) $$;
revoke all on function public.is_admin_folder(text) from public, anon;
grant execute on function public.is_admin_folder(text) to authenticated;
drop policy if exists "Team documents: replace" on storage.objects;
drop policy if exists "Team documents: delete" on storage.objects;
create policy "Team documents: replace" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (select public.is_admin_folder((storage.foldername(name))[1])));
create policy "Team documents: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (select public.is_admin_folder((storage.foldername(name))[1])));

commit;
