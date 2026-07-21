-- Shared bill snapshots, addressed by a 6-char short code.
--
-- Mostly retroactive: the table and both policies were first created by hand in
-- the Supabase dashboard, so they are written idempotently and describe what
-- production has. The receipt_path column below was added for opt-in receipt
-- sharing.
--
-- Expiry is enforced by the read policy, not by the application — the loader in
-- api.bill.$code.ts intentionally has no expires_at filter because rows past
-- their date are already invisible to the anon role. Expiry hides rows, it does
-- not delete them; the purge cron (20260720_purge_expired_shares.sql) reclaims
-- them.

CREATE TABLE IF NOT EXISTS bill_shares (
  id         TEXT PRIMARY KEY,           -- 6-char alphanumeric short code
  bill_json  JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
);

-- Path of the receipt image in the private `receipts` bucket, or NULL when the
-- sharer opted not to include one. Sharing a receipt is opt-in, so that
-- decision is data worth storing rather than inferring: a missing object on its
-- own can't distinguish "declined" from "upload failed" from "none scanned".
--
-- The path is deterministic ("<id>/receipt.jpg"), so it can be written in the
-- same INSERT that creates the share — no second write to keep consistent. It
-- therefore records intent, and a failed upload leaves a path pointing at
-- nothing, which viewers handle by hiding the image rather than by treating it
-- as an error. Only ever a path: the image bytes belong in object storage, not
-- in a column every bill read has to drag across the wire.
--
-- Never enforced as a foreign key or NOT NULL — an object cannot be uploaded
-- until its share row exists, because the storage insert policy checks for it.
ALTER TABLE bill_shares ADD COLUMN IF NOT EXISTS receipt_path TEXT;

ALTER TABLE bill_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can create a share
DROP POLICY IF EXISTS "insert_share" ON bill_shares;
CREATE POLICY "insert_share" ON bill_shares FOR INSERT WITH CHECK (true);

-- Anyone can read a share if they know the ID and it hasn't expired
DROP POLICY IF EXISTS "read_share" ON bill_shares;
CREATE POLICY "read_share" ON bill_shares FOR SELECT USING (expires_at > NOW());
