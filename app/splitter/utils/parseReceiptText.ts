export type OcrItem = { description: string; total_amount: number };

const pricePattern = /^(.+?)\s+\$?([\d]+\.[\d]{2})\s*$/;
const skipWords =
  /total|tax|tip|subtotal|gratuity|discount|change|balance|amount|due/i;

export function parseReceiptText(text: string): OcrItem[] {
  const items: OcrItem[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || skipWords.test(trimmed)) continue;
    const match = trimmed.match(pricePattern);
    if (match) {
      const description = match[1].trim();
      const total_amount = parseFloat(match[2]);
      if (description.length > 1 && total_amount > 0 && total_amount < 10000) {
        items.push({ description, total_amount });
      }
    }
  }
  return items;
}
