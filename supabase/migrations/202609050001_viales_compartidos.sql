create table if not exists public.viales_compartidos (
  id uuid primary key default gen_random_uuid(),
  viaje_id text not null references public.viajes(id) on delete cascade,
  propietario_id uuid not null references auth.users(id) on delete cascade,
  invitado_email text not null,
  invitado_id uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  unique(viaje_id, invitado_email)
);

alter table public.viales_compartidos enable row level security;

drop policy if exists "owner manages shared trips" on public.viales_compartidos;
drop policy if exists "invited users can read shared trips" on public.viales_compartidos;

create policy "owner manages shared trips" on public.viales_compartidos
  for all to authenticated
  using ((select auth.uid()) = propietario_id)
  with check ((select auth.uid()) = propietario_id);

create policy "invited users can read shared trips" on public.viales_compartidos
  for select to authenticated
  using ((select auth.uid()) = invitado_id or lower(invitado_email) = lower(coalesce((select auth.jwt()->>'email'), '')));

grant select, insert, update, delete on public.viales_compartidos to authenticated;
