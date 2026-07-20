import { createClient } from "@supabase/supabase-js";
import type { Route } from "./+types/api.parse-receipt";
import { parseReceiptText } from "~/splitter/utils/parseReceiptText";
import {
  PROMPT,
  RECEIPT_SCHEMA,
  fromSchema,
} from "~/splitter/utils/receiptSchema";

async function sha256hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

/**
 * llama-3.2-11b-vision-instruct misreads dense multi-column receipts — on a
 * Costco scan it paired item names with prices from the adjacent row. That is
 * transcription accuracy rather than prompting, so it needs a larger model.
 *
 * Costs roughly 7x its input rate (31,876 vs 4,410 neurons per M input tokens)
 * and a little less on output. The 11B measured at ~36 neurons a scan, so
 * expect ~100 — around 95 scans a day inside the free 10,000-neuron allocation.
 *
 * Cloudflare's docs class this as text generation and document no image input,
 * but the binding types declare the same messages/content/image_url shape as
 * the vision models, which is what this route already sends.
 *
 * @cf/meta/llama-4-scout-17b-16e-instruct is the alternative: also vision
 * capable, same input shape, marginally cheaper per scan (~95 neurons).
 */
const MODEL = "@cf/mistralai/mistral-small-3.1-24b-instruct";

// Llama license prohibits use for EU-domiciled individuals
const EU_COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
]);

export async function action({ request, context }: Route.ActionArgs) {
  const country = request.headers.get("CF-IPCountry") ?? "";
  if (EU_COUNTRIES.has(country)) {
    return Response.json({ error: "EU region" }, { status: 451 });
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const ipHash = await sha256hex(ip);

  const supabase = createClient(
    context.cloudflare.env.SUPABASE_URL,
    context.cloudflare.env.SUPABASE_ANON_KEY,
  );
  const month = new Date().toISOString().slice(0, 7);

  const { data } = await supabase.rpc("check_and_increment_ocr", {
    p_month: month,
    p_ip_key: ipHash,
    p_ip_cap: 10,
  });
  if (!data?.[0]?.allowed) {
    return Response.json({ error: "OCR quota reached" }, { status: 429 });
  }

  const incoming = await request.formData();
  const file = incoming.get("document");
  if (!file || typeof file === "string") {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = await (file as File).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const mimeType = (file as File).type || "image/jpeg";

  /*
   * A throw here used to surface as an opaque 500, which the client treats the
   * same as any other failure: it quietly runs Tesseract instead. That makes a
   * model error indistinguishable from a bad scan, so name it in the response.
   */
  let aiResponse: { response: string };
  try {
    aiResponse = (await context.cloudflare.env.AI.run(MODEL, {
      messages: [
        // The contract lives in the system turn so the model reads it as a
        // standing instruction rather than one line of a task it can reshape.
        // The last raw reply invented its own JSON structure over a user-role
        // prompt; this is the lever worth pulling before blaming the wording.
        { role: "system", content: PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcribe this receipt into the JSON object.",
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      guided_json: RECEIPT_SCHEMA,
      /*
       * Transcription, not writing, so sampling is pure downside. Left at the
       * default the same receipt gave different answers run to run — one pass
       * found an item the next missed, and a discount attached correctly in
       * one was dropped in the next. Prompt changes can't be judged against a
       * target that moves.
       */
      temperature: 0,
      // A long warehouse receipt with adjustments runs well past 2048, and
      // being cut off costs the tax and tip the schema emits after the items.
      max_tokens: 4096,
    })) as { response: string };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("parse-receipt: model call failed", message);
    return Response.json(
      { items: [], taxLineCount: 0, debugError: message },
      { status: 502 },
    );
  }

  const reply = aiResponse.response ?? "";
  const parsed = fromSchema(reply);

  /*
   * `observability` is enabled in wrangler.jsonc, so this reaches the dashboard
   * under Workers -> jhyn1687-github-io -> Logs, and `npx wrangler tail`.
   *
   * The raw reply is logged whole and on both paths deliberately. Nothing
   * downstream distinguishes a fenced reply from one truncated at max_tokens,
   * and a plausible-looking parse is exactly the failure worth catching — so
   * the parsed shape alone can't be trusted to tell us what happened.
   *
   * This logs receipt contents to Cloudflare. Fine while the branch is being
   * verified against Tony's own receipts; cut it back to the failure path
   * before this reaches other people's.
   */
  console.log(
    "parse-receipt",
    JSON.stringify({
      model: MODEL,
      replyLength: reply.length,
      parsed: parsed && {
        items: parsed.items.length,
        children: parsed.items.reduce(
          (n, i) => n + (i.children?.length ?? 0),
          0,
        ),
        tax: parsed.tax,
        tip: parsed.tip,
      },
      reply,
    }),
  );

  /*
   * The same reply, returned to the caller so it can be read straight from the
   * Network tab. Cloudflare's logs need the right version to be live and the
   * dashboard to agree; this needs neither, and its presence in the response
   * doubles as proof of which build answered — the question that has muddied
   * every attempt at reading this endpoint's behaviour so far.
   *
   * Debugging aid only. Remove with the verbose logging above before merge.
   */
  if (parsed) return Response.json({ ...parsed, debugReply: reply });

  // The text parser reads "NAME  12.34" rows, and pretty-printed JSON matches
  // that shape: `  "price": -3.00` becomes an item named `"price":`, indented
  // enough to be adopted as a child. It produced a bill of nonsense that looked
  // real. So it may only see a reply that was never meant to be structured.
  if (reply.includes("{")) {
    // Empty items sends the client to its local OCR fallback.
    return Response.json({ items: [], taxLineCount: 0, debugReply: reply });
  }
  return Response.json({ ...parseReceiptText(reply), debugReply: reply });
}
