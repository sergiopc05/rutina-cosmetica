-- Corrige el cron para quien ya aplicó una versión anterior de
-- 0002_notifications_cron.sql (supabase db push NO re-ejecuta una migración ya
-- aplicada, por eso hace falta esta nueva).
--
-- Deja el cron a prueba de fallos: si faltan los secretos de Vault, los jobs no
-- hacen nada en vez de reventar con
--   null value in column "url" of relation "http_request_queue"

create extension if not exists pg_cron;
create extension if not exists pg_net;

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
  where cfg.project_url is not null
    and cfg.service_key is not null
    and cfg.project_url <> ''
    and cfg.service_key <> '';
$$;

select cron.schedule(
  'materialize-notifications', '*/15 * * * *',
  $$ select public.invoke_edge_function('materialize-notifications'); $$
);

select cron.schedule(
  'dispatch-notifications', '* * * * *',
  $$ select public.invoke_edge_function('dispatch-notifications'); $$
);
