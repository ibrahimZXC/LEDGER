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
-- Realtime
-- ============================================================================

-- Enable realtime for cross-device sync (required for live updates)
alter publication supabase_realtime add table public.entities;
alter publication supabase_realtime add table public.vaults;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.settings;
