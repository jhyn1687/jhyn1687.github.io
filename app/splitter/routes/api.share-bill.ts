import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Route } from "./+types/api.share-bill";
import type { Bill } from "~/splitter/types";

// Avoids visually ambiguous characters: 0/O, 1/I/l, 5/S
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

const RECEIPT_BUCKET = "receipts";
// One receipt per share, at a deterministic path so the read side can find it
// from the code alone. The storage policies key access off the first path
// segment, so the code must be the folder.
const receiptPath = (code: string) => `${code}/receipt.jpg`;

function generateShortCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => CODE_CHARS[b % CODE_CHARS.length])
    .join("");
}

/**
 * Reads either a JSON body (bill only) or multipart form data (bill plus an
 * opt-in receipt image). Multipart is used only when a receipt rides along, so
 * the common no-receipt share stays a plain JSON post.
 */
async function readInput(
  request: Request,
): Promise<{ bill: Bill | null; receipt: File | null }> {
  const type = request.headers.get("Content-Type") ?? "";
  if (type.includes("multipart/form-data")) {
    const form = await request.formData();
    const raw = form.get("bill");
    const receipt = form.get("receipt");
    const bill = typeof raw === "string" ? (JSON.parse(raw) as Bill) : null;
    return {
      bill,
      receipt: receipt instanceof File ? receipt : null,
    };
  }
  const { bill } = (await request.json()) as { bill: Bill };
  return { bill: bill ?? null, receipt: null };
}

export async function action({ request, context }: Route.ActionArgs) {
  let bill: Bill | null;
  let receipt: File | null;
  try {
    ({ bill, receipt } = await readInput(request));
  } catch {
    return Response.json({ error: "Malformed request" }, { status: 400 });
  }
  if (!bill) {
    return Response.json({ error: "No bill provided" }, { status: 400 });
  }

  const supabase: SupabaseClient = createClient(
    context.cloudflare.env.SUPABASE_URL,
    context.cloudflare.env.SUPABASE_ANON_KEY,
  );

  // Try generating a unique code (retry on collision, up to 5 times)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShortCode();
    // The path is recorded up front to mark intent: a viewer showing the image
    // depends on this being set, and the upload below runs only after the row
    // exists, since the storage policy checks for it.
    const { error } = await supabase.from("bill_shares").insert({
      id: code,
      bill_json: bill,
      receipt_path: receipt ? receiptPath(code) : null,
    });

    if (!error) {
      if (receipt) {
        // Best-effort: the receipt is a cross-check aid, so a failed upload
        // leaves the bill shared with the image simply absent, not the whole
        // share failed. The viewer hides a receipt it can't fetch.
        const bytes = await receipt.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from(RECEIPT_BUCKET)
          .upload(receiptPath(code), bytes, {
            contentType: "image/jpeg",
            upsert: true,
          });
        if (uploadError) {
          console.error("share-bill: receipt upload failed", uploadError);
        }
      }
      const origin = new URL(request.url).origin;
      return Response.json({ url: `${origin}/splitter/share/${code}`, code });
    }

    // 23505 = unique_violation; retry with a different code
    if ((error as { code?: string }).code !== "23505") {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json(
    { error: "Could not generate unique code" },
    { status: 500 },
  );
}
