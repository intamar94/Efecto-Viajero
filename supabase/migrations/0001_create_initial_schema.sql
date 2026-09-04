-- Enable UUID extension
create extension if not exists "uuid-ossp" schema extensions;

-- Viajes table
create table public.viajes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  destino text not null,
  destino_id text,
  pais_codigo text,
  tipo text default 'individual',
  etapas jsonb default '[]'::jsonb,
  viajeros_ids text[] default '{}'::text[],
  fecha_salida date,
  fecha_regreso date,
  modo_planificacion text,
  investigacion jsonb,
  contexto jsonb default '{}'::jsonb,
  transporte jsonb default '[]'::jsonb,
  actividades jsonb default '[]'::jsonb,
  alojamiento_id text,
  souvenirs jsonb default '[]'::jsonb,
  compartido jsonb default '{}'::jsonb,
  recuerdos jsonb default '[]'::jsonb,
  creado_en timestamp with time zone default now(),
  actualizado_en timestamp with time zone default now()
);

-- Viajeros table
create table public.viajeros (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  nombre text not null,
  rol text default 'viajero',
  edad integer,
  nacionalidad text,
  pasaporte text,
  discapacidades jsonb,
  documentos jsonb default '{}'::jsonb,
  creado_en timestamp with time zone default now(),
  actualizado_en timestamp with time zone default now()
);

-- Documentos (Vault) table
create table public.documentos (
  id uuid primary key default uuid_generate_v4(),
  viaje_id uuid not null references public.viajes on delete cascade,
  nombre text not null,
  categoria text not null,
  contenido text not null,
  tipo_mime text not null,
  tamaño integer not null,
  url_almacenado text,
  creado_en timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.viajes enable row level security;
alter table public.viajeros enable row level security;
alter table public.documentos enable row level security;

-- RLS Policies
create policy "Users can only read their own viajes" on public.viajes
  for select using (auth.uid() = user_id or user_id is null);

create policy "Users can insert their own viajes" on public.viajes
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "Users can update their own viajes" on public.viajes
  for update using (auth.uid() = user_id or user_id is null);

create policy "Users can delete their own viajes" on public.viajes
  for delete using (auth.uid() = user_id or user_id is null);

create policy "Users can only read their own viajeros" on public.viajeros
  for select using (auth.uid() = user_id or user_id is null);

create policy "Users can insert their own viajeros" on public.viajeros
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "Users can update their own viajeros" on public.viajeros
  for update using (auth.uid() = user_id or user_id is null);

create policy "Users can delete their own viajeros" on public.viajeros
  for delete using (auth.uid() = user_id or user_id is null);

create policy "Users can only read documentos from their viajes" on public.documentos
  for select using (viaje_id in (select id from public.viajes where auth.uid() = user_id));

create policy "Users can insert documentos to their viajes" on public.documentos
  for insert with check (viaje_id in (select id from public.viajes where auth.uid() = user_id));

-- Indexes for performance
create index viajes_user_id_idx on public.viajes(user_id);
create index viajeros_user_id_idx on public.viajeros(user_id);
create index documentos_viaje_id_idx on public.documentos(viaje_id);
