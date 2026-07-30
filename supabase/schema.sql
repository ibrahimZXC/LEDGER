-- Business Ledger — Supabase schema
-- Run this in the Supabase SQL Editor.
-- Creates tables for entities, vaults, transactions, and user settings
-- with Row Level Security so each authenticated user only sees their own data.

-- ============================================================================
-- Tables
-- ============================================================================

create table if not exists public.entities (
  id              text primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null default '',
  phone           text not null default '',
  type            text not null check (type in ('customer', 'supplier')),
  opening_balance numeric not null default 0,
  notes           text not null default '',
  created_at      timestamptz not null default now()
);

create table if not exists public.vaults (
  id        text primary key,
  user_id   uuid not null references auth.users (id) on delete cascade,
  name      text not null default '',
  balance   numeric not null default 0
);

create table if not exists public.transactions (
  id               text primary key,
  user_id          uuid not null references auth.users (id) on delete cascade,
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
  user_id  uuid primary key references auth.users (id) on delete cascade,
  lang     text not null default 'ar',
  theme    text not null default 'light',
  brand_name text not null default '',
  brand_logo text not null default ''
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index if not exists idx_entities_user on public.entities (user_id);
create index if not exists idx_vaults_user on public.vaults (user_id);
create index if not exists idx_transactions_user on public.transactions (user_id);
create index if not exists idx_transactions_entity on public.transactions (user_id, entity_id);
create index if not exists idx_transactions_vault on public.transactions (user_id, vault_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.entities enable row level security;
alter table public.vaults enable row level security;
alter table public.transactions enable row level security;
alter table public.settings enable row level security;

-- Entities: users can only see/modify their own
drop policy if exists "entities_select_own" on public.entities;
create policy "entities_select_own" on public.entities
  for select using (auth.uid() = user_id);

drop policy if exists "entities_insert_own" on public.entities;
create policy "entities_insert_own" on public.entities
  for insert with check (auth.uid() = user_id);

drop policy if exists "entities_update_own" on public.entities;
create policy "entities_update_own" on public.entities
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "entities_delete_own" on public.entities;
create policy "entities_delete_own" on public.entities
  for delete using (auth.uid() = user_id);

-- Vaults: users can only see/modify their own
drop policy if exists "vaults_select_own" on public.vaults;
create policy "vaults_select_own" on public.vaults
  for select using (auth.uid() = user_id);

drop policy if exists "vaults_insert_own" on public.vaults;
create policy "vaults_insert_own" on public.vaults
  for insert with check (auth.uid() = user_id);

drop policy if exists "vaults_update_own" on public.vaults;
create policy "vaults_update_own" on public.vaults
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "vaults_delete_own" on public.vaults;
create policy "vaults_delete_own" on public.vaults
  for delete using (auth.uid() = user_id);

-- Transactions: users can only see/modify their own
drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

-- Settings: users can only see/modify their own row
drop policy if exists "settings_select_own" on public.settings;
create policy "settings_select_own" on public.settings
  for select using (auth.uid() = user_id);

drop policy if exists "settings_insert_own" on public.settings;
create policy "settings_insert_own" on public.settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "settings_update_own" on public.settings;
create policy "settings_update_own" on public.settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "settings_upsert_own" on public.settings;
create policy "settings_upsert_own" on public.settings
  for insert with check (auth.uid() = user_id);