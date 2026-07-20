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

// Llama 3.2 license prohibits use for EU-domiciled individuals
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
- If a discount or modification belongs to the item printed directly above it, indent it by two spaces, e.g. "  Instant savings  -3.00". A modification that costs nothing still gets a line, priced 0.00
- If a discount applies to the whole order, or you cannot tell which item it belongs to, leave it unindented as its own line. Never guess an item to attach it to
- Copy every tax line separately, exactly as it is labelled, e.g. "State Tax  1.00". Never merge them into one line and never add them together
- Copy every tip or gratuity line the same way, e.g. "Tip  3.00"
- Exclude totals, subtotals, balance due, change, and any row that sums up other rows — even if labelled AMT, TOTAL AMT, DUE, BALANCE, etc.
- Transcribe only. Never add, subtract, or reconcile amounts
- No currency symbols, no explanations, no blank lines

Example output:
Burger  12.99
  Extra bacon  2.00
  No onions  0.00
Fries  4.99
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

  const aiResponse = (await context.cloudflare.env.AI.run(
    "@cf/meta/llama-3.2-11b-vision-instruct",
    {
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
    },
  )) as { response: string };

  const { items, tax, tip, taxLineCount } = parseReceiptText(
    aiResponse.response,
  );
  return Response.json({ items, tax, tip, taxLineCount });
}
