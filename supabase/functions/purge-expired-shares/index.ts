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
  // This endpoint deletes data, so it must not be reachable with the public
  // anon key. verify_jwt is off (see config.toml) precisely so the check is
  // this exact-match against the service-role key rather than "any valid JWT",
  // which the anon key would satisfy.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);

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
