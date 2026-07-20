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
/**
 * Rows that carry no charge of their own: summaries, and the tender line naming
 * how it was paid. A card line repeats the total, so without this it lands in
 * the bill as an item worth the whole receipt.
 *
 * Word boundaries matter more than they look — unanchored, "change" matches
 * EXCHANGE, "cash" matches CASHEWS and "due" matches FONDUE, quietly dropping
 * real items.
 */
const skipWords =
  /\b(total|subtotal|balance|amount|due|change|visa|mastercard|amex|discover|debit|tender)\b/i;
const taxPattern = /\btax\b/i;
const tipPattern = /\btip\b|\bgratuity\b/i;
/**
 * Marks a restatement rather than a charge — "TOTAL TAX" beneath a "TAX" line.
 * Receipts print either, and some print both for the same money.
 */
const restatement = /\b(total|subtotal)\b/i;

/**
 * A savings line stated as a positive amount is a tally of discounts printed
 * elsewhere — receipts show "INSTANT SAVINGS  $6.50" without the sign. Taken at
 * face value it would add money to a bill it was supposed to take off. A real
 * discount reaches us negative, so the sign is what separates them.
 */
function isSavingsTally(line: string, amount: number) {
  return amount > 0 && /\bsavings?\b/i.test(line);
}

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}

function parseAmount(raw: string): number {
  const trailingMinus = raw.endsWith("-");
  const amount = parseFloat(raw.replace("$", "").replace(/-$/, ""));
  return trailingMinus ? -amount : amount;
}

export function parseReceiptText(text: string): ParsedReceipt {
  const items: OcrItem[] = [];
  // Charges and their restatements are collected separately so a receipt that
  // prints both "TAX" and "TOTAL TAX" for the same money doesn't double it.
  const charged = { tax: [] as number[], tip: [] as number[] };
  const restated = { tax: [] as number[], tip: [] as number[] };

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(pricePattern);
    if (!match) continue;
    const description = match[1].trim();
    const amount = parseAmount(match[2]);
    if (isNaN(amount) || Math.abs(amount) >= 10000) continue;

    const isTax = taxPattern.test(trimmed) && amount > 0;
    const isTip = tipPattern.test(trimmed) && amount > 0;
    // Deliberately after the tax and tip checks: skipWords matches "total",
    // which would otherwise discard a "TOTAL TAX" line and leave a receipt
    // that only labels it that way reporting no tax at all.
    if (!isTax && !isTip && skipWords.test(trimmed)) continue;
    if (isSavingsTally(trimmed, amount)) continue;

    if (isTax) {
      (restatement.test(trimmed) ? restated : charged).tax.push(amount);
    } else if (isTip) {
      (restatement.test(trimmed) ? restated : charged).tip.push(amount);
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

  // Prefer the itemised lines; fall back to a restatement only when that is the
  // sole place the receipt names the amount. Summing rather than overwriting
  // still matters within each group — split state and city tax are both real.
  const taxValues = charged.tax.length ? charged.tax : restated.tax;
  const tipValues = charged.tip.length ? charged.tip : restated.tip;

  return {
    items,
    tax: taxValues.length ? sum(taxValues) : undefined,
    tip: tipValues.length ? sum(tipValues) : undefined,
    taxLineCount: taxValues.length,
  };
}
