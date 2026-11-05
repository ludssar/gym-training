-- Piano di allenamento (scheda)
create table if not exists public.user_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_plans enable row level security;

drop policy if exists "Users manage their own plan" on public.user_plans;
create policy "Users manage their own plan"
  on public.user_plans
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Storico allenamenti (serie, carichi e ripetizioni registrati)
create table if not exists public.user_logs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  log jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_logs enable row level security;

drop policy if exists "Users manage their own log" on public.user_logs;
create policy "Users manage their own log"
  on public.user_logs
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
