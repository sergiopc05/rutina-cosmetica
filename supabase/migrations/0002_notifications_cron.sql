-- Programación de las notificaciones con pg_cron + pg_net.
--
-- ⚠️ ANTES de aplicar esta migración crea DOS secretos en Vault
--    (Dashboard → SQL Editor). Si no, los cron jobs se quedan sin hacer nada
--    (no dan error gracias al `where ... is not null` de abajo).
--
--   select vault.create_secret('https://TU-REF.supabase.co', 'project_url');
--   select vault.create_secret('TU_SERVICE_ROLE_KEY',        'service_role_key');
--
--   (el service_role key está en Project Settings → API. SIN barra final en la URL)

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Llama a una Edge Function; si faltan los secretos de Vault, no hace nada.
create or replace function public.invoke_edge_function(fn text)
returns void
language sql
security definer
set search_path = public, net, vault
as $$
  select net.http_post(
    url := cfg.project_url || '/functions/v1/' || fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cfg.service_key
    ),
    body := '{}'::jsonb
  )
  from (
    select
      btrim((select decrypted_secret from vault.decrypted_secrets
             where name = 'project_url' order by created_at desc limit 1))     as project_url,
      btrim((select decrypted_secret from vault.decrypted_secrets
             where name = 'service_role_key' order by created_at desc limit 1)) as service_key
  ) cfg
  where cfg.project_url is not null and cfg.project_url <> ''
    and cfg.service_key is not null and cfg.service_key <> '';
$$;

-- Cada 15 min: calcula los avisos de las próximas ~26 h y los mete en la cola.
select cron.schedule(
  'materialize-notifications',
  '*/15 * * * *',
  $$ select public.invoke_edge_function('materialize-notifications'); $$
);

-- Cada minuto: envía los avisos de la cola que ya han vencido.
select cron.schedule(
  'dispatch-notifications',
  '* * * * *',
  $$ select public.invoke_edge_function('dispatch-notifications'); $$
);

-- Limpieza diaria de la cola procesada.
select cron.schedule(
  'cleanup-notification-queue',
  '30 3 * * *',
  $$ delete from public.notification_queue
     where status in ('sent','skipped','failed') and scheduled_for < now() - interval '7 days'; $$
);
