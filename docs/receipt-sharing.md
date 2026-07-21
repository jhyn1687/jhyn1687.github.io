# Receipt sharing

Optionally include the scanned receipt when sharing a bill, so viewers can
cross-check the totals against the source — and clean it up when the share
expires. Opt-in, off by default, because a receipt carries a card's last-4, a
merchant address, and a timestamp.

For the step-by-step to make this live (migrations, secrets, deploy), see
[supabase-setup.md](supabase-setup.md).

## How a share is created

1. **Opt-in** — [`ShareDialog.tsx`](../app/splitter/components/ShareDialog.tsx)
   shows an "Include the scanned receipt" checkbox, only when the draft has a
   scan, reset off each time the dialog opens. The skip-dialog path never
   attaches a receipt — inclusion is always an explicit per-share choice.
2. **Upload, server-side** — [`confirmShare`](../app/splitter/hooks/useBillsStore.ts)
   posts multipart (bill JSON + receipt blob) when opted in, plain JSON
   otherwise. [`api.share-bill.ts`](../app/splitter/routes/api.share-bill.ts)
   inserts the `bill_shares` row with `receipt_path` set, **then** uploads the
   image to the private `receipts` bucket.

   Order matters: the storage insert policy checks that the share row exists, so
   the row must be written first. The path (`<code>/receipt.jpg`) is recorded in
   the insert to mark intent; a failed upload leaves the bill shared with the
   image simply absent (the viewer hides a receipt it can't fetch), rather than
   failing the whole share.

   Keys stay server-side (per the project's convention that `SUPABASE_*` never
   reaches the client bundle) — the client never touches Supabase directly.

## How a shared receipt is served

**Through a proxy, not a signed URL** —
[`api.bill.$code.receipt.ts`](../app/splitter/routes/api.bill.$code.receipt.ts)
streams the object via the RLS-gated storage download.

Why not a signed URL: it would have to outlive the 30-day client cache of the
bill to stay usable, making it a long-lived bearer token to a document with
card last-4 and an address. Proxying keeps every fetch governed by the storage
read policy, which stops serving the instant the share expires — **access and
expiry stay the same thing**, and no key reaches the client.

The bill loader ([`api.bill.$code.ts`](../app/splitter/routes/api.bill.$code.ts))
returns only a `hasReceipt` flag, never the path or image, so the payload every
viewer loads stays small. The shared view renders the same
[`ReceiptPreview`](../app/splitter/components/ReceiptPreview.tsx) pointed at
`/api/bill/:code/receipt`.

## Data model

`bill_shares.receipt_path TEXT` — the object path, or NULL when no receipt was
included. Only ever a path; the bytes live in object storage, not a column every
bill read drags across the wire. Never a foreign key or NOT NULL: the object
can't exist until its share row does (the storage policy requires it), so the
column records _intent_, and a failed upload leaves a path pointing at nothing,
which viewers handle by hiding the image.

Storage policies (`supabase/migrations/20260720_receipt_storage.sql`) key access
off the first path segment (`storage.foldername(name)[1]` = the share code) and
mirror `bill_shares`'s `read_share` (`expires_at > now()`), so an image becomes
unreadable at exactly the moment its bill does — no second expiry mechanism.

## Retention — the scheduled purge

RLS _hides_ an expired share the instant it lapses, but nothing _deletes_ it.
A receipt shouldn't sit in a bucket forever, so a nightly job reclaims it:
[`supabase/functions/purge-expired-shares/index.ts`](../supabase/functions/purge-expired-shares/index.ts),
scheduled by `supabase/migrations/20260720_purge_expired_shares.sql`
(pg_cron + pg_net).

Why an Edge Function and not pure SQL: deleting a `storage.objects` row in SQL
orphans the underlying file. The function drives the storage API, which removes
the actual bytes.

Behaviour:

- **Objects first, then rows.** If a row were deleted before its object, the
  path would be lost and the file orphaned forever. A failed removal aborts
  before the rows go, so the next run retries.
- **A 7-day grace window** past `expires_at`, so a viewer mid-request never
  races a hard delete (RLS has already been hiding it since expiry).
- **Batched** (500/run) so one invocation can't time out; the schedule catches
  up.

### Security design — the split-secret gate

The function separates two jobs the service-role key was originally doing:

- **`PURGE_INVOKE_SECRET`** — the doorbell. The cron sends it as the bearer; the
  function exact-matches it. It travels over the wire and through `pg_net`'s
  logs, so it's **low-value** — ringing the bell can't delete anything on its
  own. Stored in the `purge_config` table (for the cron to read) and as a
  function secret (for the check), the same value in both. `verify_jwt = false`
  in [`config.toml`](../supabase/config.toml) so this exact-match is the gate,
  not "any valid JWT" — which the public anon key would satisfy on a
  _destructive_ endpoint.
- **`PURGE_DB_KEY`** — the privileged key that authorizes the deletes. Read
  locally via `Deno.env`, **never sent anywhere**, so it can't surface in a log
  or request. Falls back to the auto-injected service-role key if unset; set it
  to a dedicated secret key for independent revocability.

> **Why not a scoped custom role for `PURGE_DB_KEY`?** A custom role only
> contains a leak if the credential _authenticates as that role_ — and Supabase
> secret keys are service-role-equivalent with no role selector in this
> project's dashboard, so they don't. To use a scoped role you'd need a direct
> Postgres connection with the role's password — but deleting the storage object
> _bytes_ still requires the Storage API (a service-role-level credential), which
> a narrow DB role can't call without orphaning files. So the storage half
> always needs the big key; scoping only the row-delete half is disproportionate
> complexity for a sliver of protection. A dedicated, revocable secret key is
> the practical ceiling here.

> **Vault** would be the natural home for the invoke secret, but it isn't
> provisioned on this (older) project, so `purge_config` — a one-row table with
> RLS on and no policies (unreachable via the API, readable only by the
> in-database cron) — stands in. Fine precisely because the secret is low-value.
