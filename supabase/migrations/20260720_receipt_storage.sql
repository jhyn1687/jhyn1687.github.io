-- Private bucket for receipt images attached to shared bills.
--
-- NOT YET APPLIED. This is the storage half of the opt-in receipt sharing
-- feature; the client upload path is not built yet, so nothing writes here.
--
-- Objects are keyed "<shareCode>/receipt.jpg" so the read policy can resolve
-- the owning bill from the path. That mirrors read_share on bill_shares rather
-- than inventing a second expiry mechanism: an image becomes unreadable at
-- exactly the moment its bill does.
--
-- Note this governs access, not retention — like bill_shares, expired rows and
-- objects are hidden but never deleted. A receipt carries more than item names
-- (card last-4, merchant address, a timestamp), so actual deletion is worth
-- adding before this sees real use.

INSERT INTO storage.buckets (id, name, public)
  VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Anyone can attach a receipt to a share that exists and is still live. Without
-- the bill_shares check this is an open file host for unauthenticated uploads.
DROP POLICY IF EXISTS "insert_receipt" ON storage.objects;
CREATE POLICY "insert_receipt" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND EXISTS (
      SELECT 1 FROM bill_shares
      WHERE id = (storage.foldername(name))[1]
        AND expires_at > NOW()
    )
  );

-- Readable only while the bill it belongs to is readable.
DROP POLICY IF EXISTS "read_receipt" ON storage.objects;
CREATE POLICY "read_receipt" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND EXISTS (
      SELECT 1 FROM bill_shares
      WHERE id = (storage.foldername(name))[1]
        AND expires_at > NOW()
    )
  );
