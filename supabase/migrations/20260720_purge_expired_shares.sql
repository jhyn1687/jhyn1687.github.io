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
-- Two secrets, split on purpose (see the function for the reasoning):
--   • the INVOKE secret is the doorbell the cron sends as its bearer. It travels
--     over the wire and through pg_net's logs, so it is low-value — it cannot
--     delete anything by itself. It lives in Vault (for the cron here) and as a
--     function secret (for the function to check), the same value in both.
--   • the privileged delete key lives ONLY as a function secret, read locally
--     by the function and never sent anywhere. It is not referenced here.
--
-- ── Before applying ──────────────────────────────────────────────────────────
-- 1. Generate the invoke secret (any random string):
--        openssl rand -hex 32
-- 2. Give it to the function and to Vault — same value both places:
--        supabase secrets set PURGE_INVOKE_SECRET=<value>
--        -- then, in the SQL editor:
--        select vault.create_secret('<value>', 'purge_invoke_secret');
-- 3. (Optional, for least privilege) set a scoped delete key on the function;
--    without it the function falls back to the service-role key:
--        supabase secrets set PURGE_DB_KEY=<scoped-secret-key>
-- 4. Deploy the function:
--        supabase functions deploy purge-expired-shares
-- The project ref below (yxpwwpljkuaktjdxckkh) is already public — it is the
-- host of the project's API URL — so it is hard-coded rather than templated.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace any earlier definition so re-applying is safe.
select cron.unschedule('purge-expired-shares')
where exists (
  select 1 from cron.job where jobname = 'purge-expired-shares'
);

-- 04:00 UTC daily. The bearer is only the invoke secret; the privileged key
-- that authorises the deletes lives in the function's env, never here.
select cron.schedule(
  'purge-expired-shares',
  '0 4 * * *',
  $$
  select net.http_post(
    url := 'https://yxpwwpljkuaktjdxckkh.supabase.co/functions/v1/purge-expired-shares',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'purge_invoke_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
