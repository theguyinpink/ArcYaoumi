-- WINTER ARC ♡ ELodie / Supabase SQL Editor
-- 1) Execute this file once in the target project
-- 2) In Authentication > Providers > Email: disable public sign-ups
-- 3) Create Elodie's account manually in Authentication > Users
-- 4) Storage bucket is PRIVATE; do not grant public read access

create extension if not exists pgcrypto;
-- SECURITE : une seule personne autorisee, identifiee par son UUID Auth (pas son email).
-- IMPORTANT : apres avoir cree le compte dans Authentication > Users,
-- executer la commande INSERT du fichier supabase/autoriser-elodie.sql en remplaçant l'UUID.
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
create table if not exists app_private.allowed_account (
  slot smallint primary key default 1 check (slot=1),
  user_id uuid not null unique references auth.users(id) on delete cascade
);
revoke all on app_private.allowed_account from public, anon, authenticated;

-- SECURITY DEFINER : la liste autorisee n'est pas accessible aux navigateurs.
create or replace function public.is_winter_arc_allowed() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from app_private.allowed_account
    where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_winter_arc_allowed() from public, anon, authenticated;
grant execute on function public.is_winter_arc_allowed() to authenticated;


create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Elodie',
 created_at timestamptz not null default now()
);
create table if not exists public.mission_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 mission_date date not null,
 completed_at timestamptz not null default now(),
 primary key(user_id,mission_date),
 constraint winter_arc_period check (mission_date between date '2026-11-01' and date '2027-01-31')
);
create table if not exists public.journal_entries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 entry_date date not null,
 mood text check(mood in ('serene','happy','calm','tired','stressed','sad') or mood is null),
 thoughts text not null default '',
 gratitude text not null default '',
 win text not null default '',
 photo_path text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists journal_user_date_idx on public.journal_entries(user_id,entry_date desc,created_at desc);
create table if not exists public.notification_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 config jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
create table if not exists public.push_subscriptions (
 endpoint text primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 subscription jsonb not null,
 device_label text not null default 'Appareil',
 is_primary boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists push_user_idx on public.push_subscriptions(user_id);
create table if not exists public.notification_history (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 slot_date date not null,
 slot_time text not null,
 message_id text not null,
 status text not null default 'queued',
 created_at timestamptz not null default now(),
 unique(user_id,slot_date,slot_time)
);
create index if not exists notification_user_time_idx on public.notification_history(user_id,created_at desc);

-- Safe, server-side date validation: changing phone time does not unlock a mission
create or replace function public.enforce_mission_unlock() returns trigger
language plpgsql as $$
begin
 if new.mission_date > (now() at time zone 'Europe/Paris')::date then
  raise exception 'Mission not available yet';
 end if;
 return new;
end;$$;
drop trigger if exists trg_enforce_mission_unlock on public.mission_progress;
create trigger trg_enforce_mission_unlock before insert or update on public.mission_progress
for each row execute function public.enforce_mission_unlock();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at=now();return new;end $$;
drop trigger if exists trg_journal_updated on public.journal_entries;
create trigger trg_journal_updated before update on public.journal_entries
for each row execute function public.touch_updated_at();
drop trigger if exists trg_prefs_updated on public.notification_preferences;
create trigger trg_prefs_updated before update on public.notification_preferences
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.mission_progress enable row level security;
alter table public.journal_entries enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_history enable row level security;

create policy "self_read_profiles" on public.profiles for select to authenticated using ((select auth.uid())=id and (select public.is_winter_arc_allowed()));
create policy "self_update_profiles" on public.profiles for update to authenticated using ((select auth.uid())=id and (select public.is_winter_arc_allowed())) with check ((select auth.uid())=id and (select public.is_winter_arc_allowed()));
create policy "self_read_progress" on public.mission_progress for select to authenticated using ((select auth.uid())=user_id and (select public.is_winter_arc_allowed()));
create policy "self_insert_progress" on public.mission_progress for insert to authenticated with check ((select auth.uid())=user_id and (select public.is_winter_arc_allowed()));
create policy "self_delete_progress" on public.mission_progress for delete to authenticated using ((select auth.uid())=user_id and (select public.is_winter_arc_allowed()));
create policy "self_read_journal" on public.journal_entries for select to authenticated using ((select auth.uid())=user_id and (select public.is_winter_arc_allowed()));
create policy "self_insert_journal" on public.journal_entries for insert to authenticated with check ((select auth.uid())=user_id and (select public.is_winter_arc_allowed()));
create policy "self_update_journal" on public.journal_entries for update to authenticated using ((select auth.uid())=user_id and (select public.is_winter_arc_allowed())) with check ((select auth.uid())=user_id and (select public.is_winter_arc_allowed()));
create policy "self_delete_journal" on public.journal_entries for delete to authenticated using ((select auth.uid())=user_id and (select public.is_winter_arc_allowed()));
create policy "self_read_prefs" on public.notification_preferences for select to authenticated using ((select auth.uid())=user_id and (select public.is_winter_arc_allowed()));
create policy "self_insert_prefs" on public.notification_preferences for insert to authenticated with check ((select auth.uid())=user_id and (select public.is_winter_arc_allowed()));
create policy "self_update_prefs" on public.notification_preferences for update to authenticated using ((select auth.uid())=user_id and (select public.is_winter_arc_allowed())) with check ((select auth.uid())=user_id and (select public.is_winter_arc_allowed()));
create policy "self_read_push" on public.push_subscriptions for select to authenticated using ((select auth.uid())=user_id and (select public.is_winter_arc_allowed()));
create policy "self_insert_push" on public.push_subscriptions for insert to authenticated with check ((select auth.uid())=user_id and (select public.is_winter_arc_allowed()));
create policy "self_update_push" on public.push_subscriptions for update to authenticated using ((select auth.uid())=user_id and (select public.is_winter_arc_allowed())) with check ((select auth.uid())=user_id and (select public.is_winter_arc_allowed()));
create policy "self_delete_push" on public.push_subscriptions for delete to authenticated using ((select auth.uid())=user_id and (select public.is_winter_arc_allowed()));
create policy "self_read_notification_history" on public.notification_history for select to authenticated using ((select auth.uid())=user_id and (select public.is_winter_arc_allowed()));
-- Deliberately NO client insert/update/delete on history: only the server (service role) can write it.

-- Private Storage bucket; objects stay in /<auth.uid()>/<random-uuid>.<extension>
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('journal-photos','journal-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
create policy "own_photo_select" on storage.objects for select to authenticated
 using (bucket_id='journal-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.is_winter_arc_allowed()));
create policy "own_photo_insert" on storage.objects for insert to authenticated
 with check (bucket_id='journal-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.is_winter_arc_allowed()));
create policy "own_photo_delete" on storage.objects for delete to authenticated
 using (bucket_id='journal-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.is_winter_arc_allowed()));

-- Optional display profile automatically created after a new auth user is added manually
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,display_name) values(new.id,'Elodie') on conflict do nothing;return new;end $$;
drop trigger if exists on_auth_user_created_winter_arc on auth.users;
create trigger on_auth_user_created_winter_arc after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id,display_name) select id,'Elodie' from auth.users on conflict do nothing;
