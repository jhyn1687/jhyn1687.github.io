import { createClient } from "@supabase/supabase-js";
import type { Route } from "./+types/api.share-bill";
import type { Bill } from "~/components/splitter/types";

// Avoids visually ambiguous characters: 0/O, 1/I/l, 5/S
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generateShortCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => CODE_CHARS[b % CODE_CHARS.length])
    .join("");
}

export async function action({ request, context }: Route.ActionArgs) {
  const { bill } = (await request.json()) as { bill: Bill };
  if (!bill) {
    return Response.json({ error: "No bill provided" }, { status: 400 });
  }

  const supabase = createClient(
    context.cloudflare.env.SUPABASE_URL,
    context.cloudflare.env.SUPABASE_ANON_KEY,
  );

  // Try generating a unique code (retry on collision, up to 5 times)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShortCode();
    const { error } = await supabase
      .from("bill_shares")
      .insert({ id: code, bill_json: bill });

    if (!error) {
      const origin = new URL(request.url).origin;
      return Response.json({ url: `${origin}/splitter?share=${code}`, code });
    }

    // 23505 = unique_violation; retry with a different code
    if ((error as { code?: string }).code !== "23505") {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json({ error: "Could not generate unique code" }, { status: 500 });
}
