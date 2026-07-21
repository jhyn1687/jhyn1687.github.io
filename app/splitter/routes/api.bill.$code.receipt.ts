import { createClient } from "@supabase/supabase-js";
import type { Route } from "./+types/api.bill.$code.receipt";

const RECEIPT_BUCKET = "receipts";

/**
 * Streams a shared bill's receipt image through the Worker rather than handing
 * out a signed URL. A signed URL would have to outlive the 30-day client cache
 * of the bill to stay usable, which makes it a long-lived bearer token to a
 * document holding card last-4 and an address. Proxying keeps every fetch
 * governed by the storage read policy, which stops serving the moment the share
 * expires — access and expiry stay the same thing.
 */
export async function loader({ params, context }: Route.LoaderArgs) {
  const { code } = params;
  if (!code) return new Response("Not found", { status: 404 });

  const supabase = createClient(
    context.cloudflare.env.SUPABASE_URL,
    context.cloudflare.env.SUPABASE_ANON_KEY,
  );

  const { data, error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .download(`${code}/receipt.jpg`);

  // The read policy hides the object once the share expires, so a miss here is
  // an ordinary 404 — expired, never shared, or a failed upload.
  if (error || !data) return new Response("Not found", { status: 404 });

  return new Response(data, {
    headers: {
      "Content-Type": data.type || "image/jpeg",
      // Safe to cache privately: the path is unguessable and the object is
      // immutable for a share's life.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
