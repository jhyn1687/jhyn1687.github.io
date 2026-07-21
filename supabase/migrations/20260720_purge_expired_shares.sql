-- Scheduled cleanup of expired shared bills and their receipt objects.
--
-- NOT YET APPLIED, and it has manual prerequisites — see the steps below. RLS
-- already hides a share the moment it expires; this reclaims the storage so a
-- receipt (card last-4, merchant address) doesn't linger in the bucket forever.
--
-- The delete itself lives in the `purge-expired-shares` Edge Function, which
-- can drive the storage API to remove objects — pure SQL can only drop the
-- storage.objects row, which orphans the underlying file. This migration only
-- schedules that function to run nightly.
--
-- ── Before applying ──────────────────────────────────────────────────────────
-- 1. Deploy the function:
--        supabase functions deploy purge-expired-shares
-- 2. Store the service-role key in Vault so it isn't written into this file or
--    the cron job definition (run once, in the SQL editor):
--        select vault.create_secret('<service-role-key>', 'service_role_key');
-- 3. Replace <project-ref> below with the project ref (Settings → General).
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace any earlier definition so re-applying is safe.
select cron.unschedule('purge-expired-shares')
where exists (
  select 1 from cron.job where jobname = 'purge-expired-shares'
);

-- 04:00 UTC daily. The function reads the service key from its own env and
-- checks the bearer against it, so the key never appears anywhere but Vault.
select cron.schedule(
  'purge-expired-shares',
  '0 4 * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/purge-expired-shares',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'service_role_key'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
