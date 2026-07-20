-- Shared bill snapshots, addressed by a 6-char short code.
--
-- Retroactive: this table was created by hand in the Supabase dashboard when
-- the splitter was first built, so it is written idempotently and describes
-- what production already has rather than introducing anything new.
--
-- Expiry is enforced by the read policy, not by the application — the loader in
-- api.bill.$code.ts intentionally has no expires_at filter because rows past
-- their date are already invisible to the anon role. Note that expiry hides
-- rows, it does not delete them; nothing currently reclaims expired snapshots.

CREATE TABLE IF NOT EXISTS bill_shares (
  id         TEXT PRIMARY KEY,           -- 6-char alphanumeric short code
  bill_json  JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
);

ALTER TABLE bill_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can create a share
DROP POLICY IF EXISTS "insert_share" ON bill_shares;
CREATE POLICY "insert_share" ON bill_shares FOR INSERT WITH CHECK (true);

-- Anyone can read a share if they know the ID and it hasn't expired
DROP POLICY IF EXISTS "read_share" ON bill_shares;
CREATE POLICY "read_share" ON bill_shares FOR SELECT USING (expires_at > NOW());
