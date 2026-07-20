import type { OcrItem, ParsedReceipt } from "~/splitter/utils/parseReceiptText";

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
export const RECEIPT_SCHEMA = {
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

export const PROMPT = `You are reading a receipt image. Fill in the schema from what is printed.

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

/**
 * The model ignores the schema's field names — it emitted a "price" on tax
 * lines the schema calls "amount", which silently dropped real tax. Read
 * whichever it used rather than trusting the name we asked for.
 */
function readAmount(raw: object): number | null {
  const r = raw as { price?: unknown; amount?: unknown };
  return toAmount(r.price ?? r.amount);
}

function toEntry(
  raw: unknown,
): { description: string; total_amount: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const { name } = raw as { name?: unknown };
  const amount = readAmount(raw);
  if (typeof name !== "string" || !name.trim() || amount === null) return null;
  return { description: name.trim(), total_amount: amount };
}

/**
 * Pulls the JSON object out of a reply and closes it if generation was cut off.
 *
 * A bare JSON.parse is too brittle for two reasons. Models like to wrap the
 * object in a ```json fence or introduce it with a sentence, and a long receipt
 * can hit max_tokens mid-item, which truncates it. Truncation is worth
 * recovering rather than discarding: every item before the cut was transcribed
 * fine, and losing a 40-line Costco receipt over its last row helps nobody.
 */
export function recoverJson(reply: string): string | null {
  const start = reply.indexOf("{");
  if (start === -1) return null;

  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  // Where the last nested value closed cleanly, and the brackets still open at
  // that point — what we cut back to when the reply stops mid-value.
  let safeEnd = -1;
  let safeStack: string[] = [];

  for (let i = start; i < reply.length; i++) {
    const char = reply[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "{" || char === "[") {
      stack.push(char === "{" ? "}" : "]");
    } else if (char === "}" || char === "]") {
      stack.pop();
      // Depth zero means the whole object closed, so anything after it is
      // trailing prose or a closing fence.
      if (stack.length === 0) return reply.slice(start, i + 1);
      safeEnd = i;
      safeStack = [...stack];
    }
  }

  // Nothing completed, so there is no prefix worth keeping.
  if (safeEnd === -1) return null;
  return reply.slice(start, safeEnd + 1) + safeStack.reverse().join("");
}

/**
 * Reads the structured reply. Returns null when it isn't usable at all.
 */
export function fromSchema(response: string): ParsedReceipt | null {
  const json = recoverJson(response);
  if (!json) return null;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(json) as Record<string, unknown>;
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
  // can't hang off any one of them. The model puts these under "orderDiscounts"
  // or a flat "adjustments" depending on the run, so read both.
  for (const key of ["orderDiscounts", "adjustments"] as const) {
    const list = data[key];
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      const entry = toEntry(raw);
      if (entry && entry.total_amount !== 0) items.push(entry);
    }
  }

  const taxes = Array.isArray(data.taxes)
    ? data.taxes
        .map((t) => (t && typeof t === "object" ? readAmount(t) : null))
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
