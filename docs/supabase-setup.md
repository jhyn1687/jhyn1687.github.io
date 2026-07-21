# Supabase setup runbook

What has to be applied to Supabase for the receipt features to work. The code
alone is inert until these run. None of it can be automated from the app — it's
account-side.

## Migrations in this branch

| File                                | Purpose                                                     | Required for            |
| ----------------------------------- | ----------------------------------------------------------- | ----------------------- |
| `20260720_bill_shares.sql`          | Adds `receipt_path` column (rest is idempotent/retroactive) | **Sharing at all**      |
| `20260720_receipt_storage.sql`      | Private `receipts` bucket + insert/read policies            | Receipt sharing         |
| `20260720_purge_expired_shares.sql` | `purge_config` table + nightly cron                         | Auto-cleanup (optional) |

> Because `bill_shares` was originally created **by hand in the dashboard**, run
> new migrations by pasting them into the **SQL editor** rather than
> `supabase db push`, to avoid the CLI replaying migration history it doesn't
> have. All files are written idempotently (`IF NOT EXISTS`, `CREATE OR
REPLACE`, `DROP POLICY IF EXISTS`), so re-running is safe.

## Phase 1 — required for sharing (before/with merge)

1. Run `20260720_bill_shares.sql` — adds `receipt_path`.
2. Run `20260720_receipt_storage.sql` — bucket + policies.

> **Sequencing:** the new share code inserts `receipt_path`, so if the code
> deploys before that column exists, **all** sharing throws "column does not
> exist" — not just receipts. The Supabase migration and the Cloudflare Workers
> build are independent systems triggered by the same merge and can race, so
> apply migration 1 **by hand before merging**. It's idempotent, so the
> integration re-applying it later is harmless.

**Verify:** scan a receipt → Finalize & Share with the box checked → open the
link in a private window → the receipt renders and zooms.

## Phase 2 — optional, nightly auto-cleanup

1. **Generate the invoke secret:**
   ```bash
   openssl rand -hex 32
   ```
2. **Create a dedicated secret key** — dashboard → Settings → API Keys. This
   becomes `PURGE_DB_KEY` (revocable independently of the real service-role key).
3. **Set both function secrets:**
   ```bash
   supabase secrets set PURGE_INVOKE_SECRET=<value-from-step-1>
   supabase secrets set PURGE_DB_KEY=<secret-key-from-step-2>
   ```
4. **Deploy the function:**
   ```bash
   supabase functions deploy purge-expired-shares
   ```
5. **Apply** `20260720_purge_expired_shares.sql` — creates `purge_config` and
   schedules the cron.
6. **Insert the invoke secret** into the now-existing table (SQL editor), the
   **same** value as step 1:
   ```sql
   insert into purge_config (secret) values ('<value-from-step-1>');
   ```

Step 6's value must exactly match step 3's `PURGE_INVOKE_SECRET`, or the gate
rejects the cron. If a 4am run happens before step 6, it just no-ops (null
bearer → 403) — harmless; the next night works.

**Verify** — expire a share and invoke manually:

```sql
update bill_shares set expires_at = now() - interval '8 days' where id = '<code>';
```

```bash
curl -X POST https://yxpwwpljkuaktjdxckkh.supabase.co/functions/v1/purge-expired-shares \
  -H "Authorization: Bearer <PURGE_INVOKE_SECRET>"
```

Expect `{"purged":1,"objectsRemoved":1}`, with the row and object gone.

## Notes

- **Only Phase 1 is required.** Skip Phase 2 and nothing breaks — expired
  receipts just linger (RLS-hidden) until you add it.
- **Secrets are always manual** — the merge won't set them, by design (they
  aren't in the repo). Do Phase 2 steps 1–3, 6 before the first 4am run.
- **Never commit** the secret key or invoke secret — they belong only in
  `supabase secrets` and `purge_config`.
- The project ref `yxpwwpljkuaktjdxckkh` is hard-coded in the cron URL; it's
  public (it's the host of the API URL), not a secret.
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` are set in the Cloudflare Pages/Workers
  dashboard, accessed server-side only. The purge Edge Function reads its own
  `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (auto-injected) plus the two
  `PURGE_*` secrets.
