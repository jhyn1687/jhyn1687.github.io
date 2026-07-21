-- Scheduled cleanup of expired shared bills and their receipt objects.
--
-- Has manual prerequisites (function + secrets) — see the steps below. RLS
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
--     delete anything by itself. It lives in the purge_config table below (for
--     the cron) and as a function secret (for the function to check), the same
--     value in both.
--   • the privileged delete key lives ONLY as a function secret, read locally
--     by the function and never sent anywhere. It is not referenced here.
--
-- Vault would be the natural home for the invoke secret, but it isn't available
-- on this project, so a row in a locked-down table stands in. RLS is on with no
-- policies, so no API role can read it — only the cron, which runs in-database
-- as the table owner. Acceptable precisely because the secret is low-value.
--
-- ── Setup (one-time, alongside this migration) ───────────────────────────────
-- 1. Generate the invoke secret (any random string):
--        openssl rand -hex 32
-- 2. Give the SAME value to the function and to purge_config:
--        supabase secrets set PURGE_INVOKE_SECRET=<value>
--        -- and, after this migration has created the table, in the SQL editor:
--        insert into purge_config (secret) values ('<value>');
-- 3. Set a dedicated secret key (dashboard → Settings → API Keys) as the delete
--    key; without it the function falls back to the service-role key:
--        supabase secrets set PURGE_DB_KEY=<secret-key>
-- 4. Deploy the function:
--        supabase functions deploy purge-expired-shares
-- The project ref below (yxpwwpljkuaktjdxckkh) is already public — it is the
-- host of the project's API URL — so it is hard-coded rather than templated.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Holds the invoke secret for the cron to read. One row. RLS on, no policies:
-- unreachable through the API, readable only by the in-database cron.
create table if not exists purge_config (secret text not null);
alter table purge_config enable row level security;

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
      'Authorization', 'Bearer ' || (select secret from purge_config limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
