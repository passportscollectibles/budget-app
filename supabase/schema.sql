-- Personal Budget App — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Single-user app: RLS is permissive (anon can read/write). Tighten if you ever add auth.

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('checking','savings','robinhood','loan','credit_card','other')),
  balance numeric(12,2) not null default 0,
  last4 text,
  updated_at timestamptz not null default now()
);

-- Migrations for accounts evolving from earlier schema:
alter table accounts add column if not exists last4 text;
alter table accounts drop constraint if exists accounts_kind_check;
alter table accounts add constraint accounts_kind_check
  check (kind in ('checking','savings','robinhood','loan','credit_card','other'));

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  description text not null,
  amount numeric(12,2) not null,
  category text not null check (category in ('food','transport','shopping','health','entertainment','utilities','other')),
  venmoed_back numeric(12,2) not null default 0,
  is_business boolean not null default false,
  account_id uuid references accounts(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists transactions_date_idx on transactions (date desc);
create index if not exists transactions_category_idx on transactions (category);
create index if not exists transactions_is_business_idx on transactions (is_business);
create index if not exists transactions_account_id_idx on transactions (account_id);

-- Migrations for transactions evolving from earlier schema:
alter table transactions add column if not exists is_business boolean not null default false;
alter table transactions add column if not exists account_id uuid references accounts(id) on delete set null;

create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) not null default 0,
  target_date date,
  updated_at timestamptz not null default now()
);

-- Loans table removed — drop it if migrating from an earlier schema.
drop table if exists loans;

-- RLS: single-user app behind Supabase Auth. Any authenticated user can
-- read/write everything. Since accounts are provisioned manually via the
-- Supabase dashboard, "authenticated" effectively means the owner.
alter table transactions enable row level security;
alter table savings_goals enable row level security;
alter table accounts enable row level security;

-- Drop legacy anon_all policies (from the pre-auth schema) if they exist.
drop policy if exists anon_all on transactions;
drop policy if exists anon_all on savings_goals;
drop policy if exists anon_all on accounts;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'transactions' and policyname = 'auth_all') then
    create policy auth_all on transactions for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'savings_goals' and policyname = 'auth_all') then
    create policy auth_all on savings_goals for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'accounts' and policyname = 'auth_all') then
    create policy auth_all on accounts for all to authenticated using (true) with check (true);
  end if;
end $$;
