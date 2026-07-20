import { createClient } from "@supabase/supabase-js";
import type { Route } from "./+types/api.parse-receipt";
import {
  parseReceiptText,
  type OcrItem,
  type ParsedReceipt,
} from "~/splitter/utils/parseReceiptText";

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

/**
 * Asking for structure directly, rather than for indented text we then parse.
 * The two-space indent convention was the weakest link: the model had to invent
 * a layout to express "this discount belongs to that item", and when it wasn't
 * sure it dropped the line instead. A nested field says the same thing without
 * relying on whitespace surviving the round trip.
 *
 * `taxes` is a list rather than one number so split state and city tax stay
 * distinct — several tax lines can also mean two receipts in one image, and
 * that only shows up if they arrive separately.
 */
const RECEIPT_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      description: "Every purchased item, in the order printed.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "The item's printed name." },
          price: {
            type: "number",
            description: "Total paid for this item, before its adjustments.",
          },
          adjustments: {
            type: "array",
            description:
              "Discounts, deposits, fees and modifications belonging to this item. A discount is negative; a deposit or fee is positive; a free modification is 0.",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                price: { type: "number" },
              },
              required: ["name", "price"],
            },
          },
        },
        required: ["name", "price", "adjustments"],
      },
    },
    orderDiscounts: {
      type: "array",
      description:
        "Discounts applying to the whole order rather than one item. Negative amounts.",
      items: {
        type: "object",
        properties: { name: { type: "string" }, price: { type: "number" } },
        required: ["name", "price"],
      },
    },
    taxes: {
      type: "array",
      description:
        "Each tax line as printed, kept separate. Empty if the receipt shows none.",
      items: {
        type: "object",
        properties: { name: { type: "string" }, amount: { type: "number" } },
        required: ["name", "amount"],
      },
    },
    tip: {
      type: "number",
      description: "Tip or gratuity, 0 if the receipt shows none.",
    },
  },
  required: ["items", "orderDiscounts", "taxes", "tip"],
};

const PROMPT = `You are reading a receipt image. Fill in the schema from what is printed.

Rules:
- Read each row straight across. A price belongs to the name printed on its own row, never to the row above or below it
- Copy every digit exactly. 23.89 is not 2.89
- A line showing only a quantity and unit price, such as "2 @ 3.99", is not an item. It describes a neighbouring row whose own line already carries the total paid
- A line that discounts, deposits against, or modifies another item belongs in that item's "adjustments", never as an item of its own. Receipts mark these by printing them directly beneath the item, or by referencing it — a bottle deposit reading "EE/782796" belongs to item 782796, and a discount reading "/1843108" belongs to item 1843108. Name it after what it is, e.g. "Instant savings" or "Bottle deposit"
- Write a discount as a negative amount: "3.00-" becomes -3.00
- Put a discount in "orderDiscounts" only when it applies to the whole order. Never guess an item for it
- Record every tax line in "taxes", even where it is printed among the totals. Tax is never a total. If the same tax appears twice, once as "TAX" and again as "TOTAL TAX", record it once
- Ignore totals, subtotals, balance due, change, the payment line naming a card or tender type, and any row that adds up other rows — including a savings total printed at the end, whose parts you have already recorded
- Transcribe only. Never add, subtract, or reconcile amounts`;

/** Coerces a value the model may have emitted as a string, rejecting nonsense. */
function toAmount(value: unknown): number | null {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (typeof n !== "number" || !isFinite(n) || Math.abs(n) >= 10000)
    return null;
  return n;
}

function toEntry(
  raw: unknown,
): { description: string; total_amount: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const { name, price } = raw as { name?: unknown; price?: unknown };
  const amount = toAmount(price);
  if (typeof name !== "string" || !name.trim() || amount === null) return null;
  return { description: name.trim(), total_amount: amount };
}

/**
 * Reads the structured reply. Returns null when it isn't usable at all, which
 * lets the caller fall back to parsing the response as text.
 */
function fromSchema(response: string): ParsedReceipt | null {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(response) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!data || !Array.isArray(data.items)) return null;

  const items: OcrItem[] = [];
  for (const raw of data.items) {
    const entry = toEntry(raw);
    if (!entry) continue;
    const adjustments = (raw as { adjustments?: unknown }).adjustments;
    const children = Array.isArray(adjustments)
      ? adjustments.map(toEntry).filter((c) => c !== null)
      : [];
    items.push(children.length ? { ...entry, children } : entry);
  }

  // Order-level discounts sit alongside items: they belong to everyone, so they
  // can't hang off any one of them.
  if (Array.isArray(data.orderDiscounts)) {
    for (const raw of data.orderDiscounts) {
      const entry = toEntry(raw);
      if (entry && entry.total_amount !== 0) items.push(entry);
    }
  }

  const taxes = Array.isArray(data.taxes)
    ? data.taxes
        .map((t) => toAmount((t as { amount?: unknown })?.amount))
        .filter((n): n is number => n !== null && n > 0)
    : [];
  const tip = toAmount(data.tip);

  return {
    items,
    tax: taxes.length ? taxes.reduce((a, b) => a + b, 0) : undefined,
    tip: tip && tip > 0 ? tip : undefined,
    taxLineCount: taxes.length,
  };
}

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
    guided_json: RECEIPT_SCHEMA,
    max_tokens: 2048,
  })) as { response: string };

  // Falls back to reading the reply as text when the schema isn't honoured, so
  // a malformed response degrades to the old behaviour rather than to nothing.
  const parsed =
    fromSchema(aiResponse.response) ?? parseReceiptText(aiResponse.response);
  return Response.json(parsed);
}
