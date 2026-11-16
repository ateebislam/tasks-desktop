-- Tasks cloud sync: run this once in Supabase → SQL Editor → New query → Run.
-- It is safe to run again.

-- 1. One row per task, archived task, trashed task, or list (buckets, rules, …).
create table if not exists public.records (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  store      text not null,               -- 'data', 'data-marketing', 'archive', 'workspaces', …
  key        text not null,               -- 't/<task id>', 'a/<id>', 'x/<id>', 'm/buckets', …
  value      jsonb,                        -- null when deleted
  deleted    boolean not null default false,
  edited_at  bigint not null default 0,    -- when it was edited on the PC (ms), decides which edit is newer
  device     text,                         -- which PC sent it
  updated_at timestamptz not null default now(),
  primary key (user_id, store, key)
);
create index if not exists records_user_updated on public.records (user_id, updated_at);

-- The server stamps the time, so PCs with slightly wrong clocks never miss a change.
create or replace function public.records_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
for each row execute function public.records_touch();

-- 2. Only you can see or change your rows.
alter table public.records enable row level security;
drop policy if exists "Own rows" on public.records;
create policy "Own rows" on public.records for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.records from anon;
grant select, insert, update, delete on public.records to authenticated;

-- 3. Live updates between open PCs.
do $$ begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null; end $$;

-- 4. A private bucket for documents. Each user's files live in a folder named after their user id.
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;
drop policy if exists "Own documents: read" on storage.objects;
drop policy if exists "Own documents: add" on storage.objects;
drop policy if exists "Own documents: replace" on storage.objects;
drop policy if exists "Own documents: delete" on storage.objects;
create policy "Own documents: read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Own documents: add" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Own documents: replace" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Own documents: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
