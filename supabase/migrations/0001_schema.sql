-- Esquema de "Rutina Cosmética".
-- Modelo local-first: el cliente pone id/created_at/updated_at/deleted_at y el
-- servidor solo los almacena. La sincronización usa updated_at (last-write-wins).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Perfil
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text,
  timezone     text not null default 'UTC',
  app_name     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "perfil propio: leer"   on public.profiles for select using (id = auth.uid());
create policy "perfil propio: crear"  on public.profiles for insert with check (id = auth.uid());
create policy "perfil propio: editar" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Tablas sincronizables
-- ---------------------------------------------------------------------------
create table public.products (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  name             text not null default '',
  brand            text,
  barcode          text,
  photo_path       text,
  off_image_url    text,
  off_data         jsonb,
  ingredients_text text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create table public.routines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null default 'Mi rutina',
  is_active  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.routine_slots (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  routine_id   uuid not null references public.routines on delete cascade,
  product_id   uuid references public.products on delete set null,
  title        text,
  time_local   text not null default '08:00',
  weekdays     smallint[] not null default '{1,2,3,4,5,6,7}',
  step_order   integer not null default 0,
  instructions text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create table public.routine_exceptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  routine_id   uuid not null references public.routines on delete cascade,
  date         date not null,
  kind         text not null check (kind in ('skip','add','replace')),
  slot_id      uuid references public.routine_slots on delete cascade,
  product_id   uuid references public.products on delete set null,
  title        text,
  time_local   text,
  instructions text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create table public.step_completions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  date         date not null,
  slot_id      uuid references public.routine_slots on delete cascade,
  exception_id uuid references public.routine_exceptions on delete cascade,
  completed_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

-- Índices para el cursor de sincronización y las consultas por rutina.
create index products_sync_idx            on public.products (user_id, updated_at);
create index routines_sync_idx            on public.routines (user_id, updated_at);
create index routine_slots_sync_idx       on public.routine_slots (user_id, updated_at);
create index routine_slots_routine_idx    on public.routine_slots (routine_id);
create index routine_exceptions_sync_idx  on public.routine_exceptions (user_id, updated_at);
create index routine_exceptions_route_idx on public.routine_exceptions (routine_id, date);
create index step_completions_sync_idx    on public.step_completions (user_id, updated_at);

-- RLS idéntica para todas: cada quien ve y edita solo lo suyo.
do $$
declare t text;
begin
  foreach t in array array[
    'products','routines','routine_slots','routine_exceptions','step_completions'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('create policy "propio: leer"   on public.%I for select using (user_id = auth.uid());', t);
    execute format('create policy "propio: crear"  on public.%I for insert with check (user_id = auth.uid());', t);
    execute format('create policy "propio: editar" on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
    execute format('create policy "propio: borrar" on public.%I for delete using (user_id = auth.uid());', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Suscripciones Web Push (se gestionan directo contra la API, no por el sync)
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  platform   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.push_subscriptions enable row level security;
create policy "push propio: leer"   on public.push_subscriptions for select using (user_id = auth.uid());
create policy "push propio: crear"  on public.push_subscriptions for insert with check (user_id = auth.uid());
create policy "push propio: editar" on public.push_subscriptions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push propio: borrar" on public.push_subscriptions for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Cola de notificaciones (la rellena y consume el backend)
-- ---------------------------------------------------------------------------
create table public.notification_queue (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  routine_id    uuid,
  slot_id       uuid,
  exception_id  uuid,
  for_date      date not null,
  scheduled_for timestamptz not null,
  dedupe_key    text not null,
  title         text not null,
  body          text not null,
  status        text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  attempts      integer not null default 0,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz,
  unique (user_id, dedupe_key)
);

create index notification_queue_due_idx on public.notification_queue (status, scheduled_for);

alter table public.notification_queue enable row level security;
create policy "cola propia: leer" on public.notification_queue for select using (user_id = auth.uid());
-- Sin políticas de escritura: solo el service_role (Edge Functions) escribe.

-- ---------------------------------------------------------------------------
-- Storage: fotos de producto
-- ---------------------------------------------------------------------------
-- Bucket público: la ruta lleva un UUID imposible de adivinar, así las URLs no
-- caducan y el service worker las cachea de forma fiable para uso offline.
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do update set public = true;

create policy "fotos: subir propias"
  on storage.objects for insert
  with check (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos: actualizar propias"
  on storage.objects for update
  using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos: borrar propias"
  on storage.objects for delete
  using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Realtime: para que editar en el navegador se refleje en el móvil al instante
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'products','routines','routine_slots','routine_exceptions','step_completions'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
