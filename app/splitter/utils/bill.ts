import type { Bill, Item } from "~/splitter/types";

/**
 * What an item actually costs: its own price plus every sub-item. Sub-items
 * follow the parent's assignment, so this is the figure to split, total, and
 * apportion tax by — `item.price` alone undercounts anything with children.
 *
 * Blank inputs come through as NaN while a row is being edited, so those are
 * treated as zero rather than poisoning the sum.
 */
export function itemTotal(item: Item): number {
  const base = isNaN(item.price) ? 0 : item.price;
  return (item.children ?? []).reduce(
    (sum, child) => sum + (isNaN(child.price) ? 0 : child.price),
    base,
  );
}

export function canShareBill(bill: Bill): boolean {
  return (
    bill.title.trim() !== "" &&
    bill.participants.length > 0 &&
    bill.items.length > 0 &&
    bill.items.every((i) => i.splitBetween.length > 0)
  );
}
