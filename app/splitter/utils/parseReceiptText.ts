export type OcrSubItem = { description: string; total_amount: number };

export type OcrItem = {
  description: string;
  total_amount: number;
  /** Modifications and item-level discounts printed beneath this item. */
  children?: OcrSubItem[];
};

export type ParsedReceipt = {
  items: OcrItem[];
  tax?: number;
  tip?: number;
  /**
   * How many separate tax lines were seen. More than one usually means either a
   * split tax (state + city) or several receipts scanned into one image, so the
   * caller should ask the user to double-check the totals.
   */
  taxLineCount: number;
};

/**
 * Receipts print negatives both ways: "-2.00" and, on Costco and many other POS
 * systems, "2.00-" with the sign trailing. Only the leading form used to match,
 * so trailing-minus discount lines were dropped silently.
 */
const pricePattern = /^(.+?)\s+(-?\$?[\d]+\.[\d]{2}-?)\s*$/;
const skipWords = /total|subtotal|change|balance|amount|due/i;
const taxPattern = /\btax\b/i;
const tipPattern = /\btip\b|\bgratuity\b/i;

function parseAmount(raw: string): number {
  const trailingMinus = raw.endsWith("-");
  const amount = parseFloat(raw.replace("$", "").replace(/-$/, ""));
  return trailingMinus ? -amount : amount;
}

export function parseReceiptText(text: string): ParsedReceipt {
  const items: OcrItem[] = [];
  let tax: number | undefined;
  let tip: number | undefined;
  let taxLineCount = 0;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || skipWords.test(trimmed)) continue;
    const match = trimmed.match(pricePattern);
    if (!match) continue;
    const description = match[1].trim();
    const amount = parseAmount(match[2]);
    if (isNaN(amount) || Math.abs(amount) >= 10000) continue;

    if (taxPattern.test(trimmed) && amount > 0) {
      // Sum rather than overwrite — receipts often split tax across lines, and
      // a stitched multi-page scan can carry one tax line per receipt.
      tax = (tax ?? 0) + amount;
      taxLineCount++;
    } else if (tipPattern.test(trimmed) && amount > 0) {
      tip = (tip ?? 0) + amount;
    } else if (description.length > 1) {
      // Indentation marks a modification or discount belonging to the item
      // above it. The model is asked to preserve it precisely so attribution is
      // structural rather than something we have to infer from the numbers.
      const isChild = /^\s/.test(line) && items.length > 0;
      if (isChild) {
        // Zero is kept here, unlike for a top-level row: a no-cost
        // modification records whose item it is even though it costs nothing.
        const parent = items[items.length - 1];
        parent.children = [
          ...(parent.children ?? []),
          { description, total_amount: amount },
        ];
      } else if (amount !== 0) {
        items.push({ description, total_amount: amount });
      }
    }
  }

  return { items, tax, tip, taxLineCount };
}
