-- Business Ledger — Supabase schema
-- Run this in the Supabase SQL Editor.
-- Creates tables for entities, vaults, transactions, and settings.
-- No auth required — data is shared across all devices.

-- ============================================================================
-- Tables
-- ============================================================================

create table if not exists public.entities (
  id              text primary key,
  name            text not null default '',
  phone           text not null default '',
  type            text not null check (type in ('customer', 'supplier')),
  opening_balance numeric not null default 0,
  notes           text not null default '',
  created_at      timestamptz not null default now()
);

create table if not exists public.vaults (
  id        text primary key,
  name      text not null default '',
  balance   numeric not null default 0
);

create table if not exists public.transactions (
  id               text primary key,
  date             text not null,
  entity_type      text not null check (entity_type in ('customer', 'supplier')),
  entity_id        text not null,
  vault_id         text not null default '',
  type             text not null,
  quantity         numeric not null default 0,
  unit_price       numeric not null default 0,
  total_amount     numeric not null default 0,
  amount_paid      numeric not null default 0,
  remaining_balance numeric not null default 0,
  notes            text not null default '',
  ref              integer
);

create table if not exists public.settings (
  id         text primary key default 'default',
  lang       text not null default 'ar',
  theme      text not null default 'light',
  brand_name text not null default '',
  brand_logo text not null default ''
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index if not exists idx_transactions_entity on public.transactions (entity_id);
create index if not exists idx_transactions_vault on public.transactions (vault_id);

-- ============================================================================
-- Enable public access (no auth required)
-- ============================================================================

alter table public.entities enable row level security;
alter table public.vaults enable row level security;
alter table public.transactions enable row level security;
alter table public.settings enable row level security;

-- Allow everything for anon users (open app, no login)
drop policy if exists "entities_public_all" on public.entities;
create policy "entities_public_all" on public.entities
  for all using (true) with check (true);

drop policy if exists "vaults_public_all" on public.vaults;
create policy "vaults_public_all" on public.vaults
  for all using (true) with check (true);

drop policy if exists "transactions_public_all" on public.transactions;
create policy "transactions_public_all" on public.transactions
  for all using (true) with check (true);

drop policy if exists "settings_public_all" on public.settings;
create policy "settings_public_all" on public.settings
  for all using (true) with check (true);

-- ============================================================================
-- Grants (CRITICAL: without these, anon SELECT returns empty instead of an error,
-- causing the app to think Supabase is empty and wipe remote data with local data)
-- ============================================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.entities     to anon, authenticated;
grant select, insert, update, delete on public.vaults       to anon, authenticated;
grant select, insert, update, delete on public.transactions to anon, authenticated;
grant select, insert, update, delete on public.settings     to anon, authenticated;

-- ============================================================================
-- Remove auth policies/columns if they exist (app is shared, no per-user data)
-- ============================================================================

drop policy if exists "entities_select_own" on public.entities;
drop policy if exists "entities_insert_own" on public.entities;
drop policy if exists "entities_update_own" on public.entities;
drop policy if exists "entities_delete_own" on public.entities;

drop policy if exists "vaults_select_own" on public.vaults;
drop policy if exists "vaults_insert_own" on public.vaults;
drop policy if exists "vaults_update_own" on public.vaults;
drop policy if exists "vaults_delete_own" on public.vaults;

drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;

drop policy if exists "settings_select_own" on public.settings;
drop policy if exists "settings_insert_own" on public.settings;
drop policy if exists "settings_update_own" on public.settings;
drop policy if exists "settings_delete_own" on public.settings;

alter table public.entities drop column if exists user_id;
alter table public.vaults drop column if exists user_id;
alter table public.transactions drop column if exists user_id;
alter table public.settings drop column if exists user_id;

-- ============================================================================
-- Realtime

-- Enable realtime for cross-device sync (required for live updates).
-- Uses a DO block that checks both table existence AND publication membership
-- so it's fully idempotent (safe to run multiple times without errors).
do $$
begin
  if to_regclass('public.entities') is not null and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'entities'
  ) then
    alter publication supabase_realtime add table public.entities;
  end if;
  if to_regclass('public.vaults') is not null and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vaults'
  ) then
    alter publication supabase_realtime add table public.vaults;
  end if;
  if to_regclass('public.transactions') is not null and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
  if to_regclass('public.settings') is not null and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'settings'
  ) then
    alter publication supabase_realtime add table public.settings;
  end if;
end $$;
