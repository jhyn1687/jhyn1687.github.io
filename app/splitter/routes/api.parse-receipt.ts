import { createClient } from "@supabase/supabase-js";
import type { Route } from "./+types/api.parse-receipt";
import { parseReceiptText } from "~/splitter/utils/parseReceiptText";

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

const PROMPT = `You are reading a receipt image. Output one entry per line using this exact format:
  <name>  <price>

Rules:
- Keep the receipt's original order. Never move a line
- Write negative amounts with the minus in front, e.g. "2.00-" becomes "-2.00"
- Skip any line that shows only a quantity and unit price, such as "2 @ 3.99". It describes the item on a neighbouring line, whose own line already carries the total paid. Never output a quantity as a name, and never pair it with a price from an adjacent row
- Read each row straight across. A price belongs to the name printed on its own row, never to the row above or below it
- If a discount or modification belongs to the item printed directly above it, or names or references that item, indent it by two spaces, e.g. "  Instant savings  -3.00". A modification that costs nothing still gets a line, priced 0.00
- If a discount applies to the whole order, or you cannot tell which item it belongs to, leave it unindented as its own line. Never guess an item to attach it to
- Copy every tax line separately, exactly as it is labelled, e.g. "State Tax  1.00". Tax is never a total: include it even where it is printed among the totals. Never merge tax lines and never add them together. If the same tax is stated twice, once as "TAX" and again as "TOTAL TAX", output only the first
- Copy every tip or gratuity line the same way, e.g. "Tip  3.00"
- Exclude totals, subtotals, balance due and change — even if labelled AMT, TOTAL AMT, DUE, BALANCE, etc.
- Exclude the payment line naming a card or tender type (VISA, MASTERCARD, DEBIT, CASH); it only repeats the total
- Exclude any row that adds up other rows, including a savings or discount total printed at the end — keep the individual discount lines instead
- Transcribe only. Never add, subtract, or reconcile amounts
- No currency symbols, no explanations, no blank lines

Example output:
Burger  12.99
  Extra bacon  2.00
  No onions  0.00
Bottled water  7.98
  Instant savings  -3.00
Member savings  -5.00
State Tax  1.00
City Tax  0.50
Tip  3.00`;

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

  const aiResponse = (await context.cloudflare.env.AI.run(MODEL, {
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
        ],
      },
    ],
    max_tokens: 1024,
  })) as { response: string };

  const { items, tax, tip, taxLineCount } = parseReceiptText(
    aiResponse.response,
  );
  return Response.json({ items, tax, tip, taxLineCount });
}
