// Deletes shared bills whose links have expired: first the receipt objects in
// storage, then the rows. Invoked on a schedule by pg_cron (see the migration
// 20260720_purge_expired_shares.sql). Run on demand with:
//   supabase functions deploy purge-expired-shares
//
// RLS already hides expired shares the instant they lapse, so this is only
// about reclaiming storage — a receipt holds a card's last 4 and a merchant
// address, so it shouldn't sit in a bucket forever. Deletion trails expiry by a
// grace window so a viewer mid-request never races a hard delete.

import { createClient } from "jsr:@supabase/supabase-js@2";

const RECEIPT_BUCKET = "receipts";
// Delete only well after RLS stopped serving the share, never right at expiry.
const GRACE_DAYS = 7;
// Bounded so one run can't time out on a large backlog; the schedule catches up.
const BATCH = 500;

Deno.serve(async (req) => {
  // Two separate secrets, deliberately:
  //
  // PURGE_INVOKE_SECRET is the doorbell — a low-value random string the cron
  // sends as its bearer and this checks. It travels over the wire (and through
  // pg_net's logs), so it is worth nothing on its own: ringing the bell with it
  // still can't delete anything without the key below. verify_jwt is off (see
  // config.toml) so this exact-match is the gate rather than "any valid JWT",
  // which the public anon key would satisfy.
  const invokeSecret = Deno.env.get("PURGE_INVOKE_SECRET") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!invokeSecret || auth !== `Bearer ${invokeSecret}`) {
    return new Response("Forbidden", { status: 403 });
  }

  // PURGE_DB_KEY is the privileged key that actually authorises the deletes. It
  // is read locally and never leaves the function, so it never lands in a log
  // or a request. Set it to a scoped secret key to cap the blast radius;
  // absent, it falls back to the auto-injected service-role key so the function
  // still works out of the box.
  const dbKey =
    Deno.env.get("PURGE_DB_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    "";

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", dbKey);

  const cutoff = new Date(
    Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Find the lapsed shares. receipt_path is null for shares with no receipt —
  // those need only the row deleted.
  const { data: expired, error: selectError } = await supabase
    .from("bill_shares")
    .select("id, receipt_path")
    .lt("expires_at", cutoff)
    .limit(BATCH);

  if (selectError) {
    console.error("purge: select failed", selectError);
    return Response.json({ error: selectError.message }, { status: 500 });
  }
  if (!expired || expired.length === 0) {
    return Response.json({ purged: 0, objectsRemoved: 0 });
  }

  // Objects first: if a row were deleted before its object, the path would be
  // lost and the file orphaned forever. A failed removal aborts before the rows
  // go, so the next run retries rather than stranding bytes.
  const paths = expired
    .map((r) => r.receipt_path)
    .filter((p): p is string => typeof p === "string" && p.length > 0);

  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .remove(paths);
    if (removeError) {
      console.error("purge: object removal failed", removeError);
      return Response.json({ error: removeError.message }, { status: 500 });
    }
  }

  const ids = expired.map((r) => r.id);
  const { error: deleteError } = await supabase
    .from("bill_shares")
    .delete()
    .in("id", ids);

  if (deleteError) {
    console.error("purge: row delete failed", deleteError);
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  return Response.json({ purged: ids.length, objectsRemoved: paths.length });
});
