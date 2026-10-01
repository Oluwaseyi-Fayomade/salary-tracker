create table if not exists public.user_finance_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_finance_snapshots enable row level security;
grant select, insert, update, delete on public.user_finance_snapshots to authenticated;
create policy "read own finance snapshot" on public.user_finance_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own finance snapshot" on public.user_finance_snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own finance snapshot" on public.user_finance_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own finance snapshot" on public.user_finance_snapshots for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.mono_account_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reference text not null unique,
  mono_account_id text,
  status text not null default 'pending' check (status in ('pending','PROCESSING','AVAILABLE','PARTIAL','UNAVAILABLE','FAILED','unlinked')),
  institution text,
  currency text,
  retrieved_data jsonb not null default '[]'::jsonb,
  consented_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.mono_account_links enable row level security;
grant select on public.mono_account_links to authenticated;
create policy "read own bank link status" on public.mono_account_links for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.mono_account_links from anon, authenticated;
