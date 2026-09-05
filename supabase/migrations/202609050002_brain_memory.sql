-- Persistent snapshots for the travel brain.
-- The application injects the persistence adapter; this table stores structured
-- brain state rather than chat transcripts.
create table if not exists public.brain_snapshots (
  id uuid primary key default uuid_generate_v4(),
  run_id text not null unique,
  viaje_id uuid references public.viajes on delete cascade,
  user_id uuid references auth.users on delete cascade,
  state jsonb not null default '{}'::jsonb,
  creado_en timestamp with time zone default now(),
  actualizado_en timestamp with time zone default now()
);

alter table public.brain_snapshots enable row level security;

create policy "Users can read their own brain snapshots" on public.brain_snapshots
  for select using (auth.uid() = user_id or user_id is null);

create policy "Users can insert their own brain snapshots" on public.brain_snapshots
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "Users can update their own brain snapshots" on public.brain_snapshots
  for update using (auth.uid() = user_id or user_id is null);

create policy "Users can delete their own brain snapshots" on public.brain_snapshots
  for delete using (auth.uid() = user_id or user_id is null);

create index if not exists brain_snapshots_viaje_id_idx on public.brain_snapshots(viaje_id);
create index if not exists brain_snapshots_user_id_idx on public.brain_snapshots(user_id);
create index if not exists brain_snapshots_state_idx on public.brain_snapshots using gin(state);
