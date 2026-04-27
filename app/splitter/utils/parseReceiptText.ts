export type OcrItem = { description: string; total_amount: number };

export type ParsedReceipt = {
  items: OcrItem[];
  tax?: number;
  tip?: number;
};

const pricePattern = /^(.+?)\s+(-?\$?[\d]+\.[\d]{2})\s*$/;
const skipWords = /total|subtotal|change|balance|amount|due/i;
const taxPattern = /\btax\b/i;
const tipPattern = /\btip\b|\bgratuity\b/i;

export function parseReceiptText(text: string): ParsedReceipt {
  const items: OcrItem[] = [];
  let tax: number | undefined;
  let tip: number | undefined;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || skipWords.test(trimmed)) continue;
    const match = trimmed.match(pricePattern);
    if (!match) continue;
    const description = match[1].trim();
    const amount = parseFloat(match[2].replace("$", ""));
    if (isNaN(amount) || Math.abs(amount) >= 10000) continue;

    if (taxPattern.test(trimmed) && amount > 0) {
      tax = amount;
    } else if (tipPattern.test(trimmed) && amount > 0) {
      tip = amount;
    } else if (description.length > 1 && amount !== 0) {
      items.push({ description, total_amount: amount });
    }
  }

  return { items, tax, tip };
}
