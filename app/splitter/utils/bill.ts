import type { Bill, Item, Participant } from "~/splitter/types";

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

/** One line under a participant, explaining what makes up their share. */
export interface BreakdownLine {
  name: string;
  amount: number;
  children: Array<{ name: string; amount: number }>;
}

/** Everything one participant owes, and why. */
export interface PersonBreakdown {
  participant: Participant;
  itemsTotal: number;
  taxShare: number;
  tipShare: number;
  total: number;
  myItems: BreakdownLine[];
}

export interface BillBreakdown {
  breakdowns: PersonBreakdown[];
  /** Sum of every item (net of discounts) — the grand total before tax and tip. */
  subtotal: number;
  /** subtotal + tax + tip. */
  grandTotal: number;
}

/**
 * Splits a bill into what each participant owes.
 *
 * Each item is divided evenly among the people assigned to it. Tax and tip are
 * then apportioned by what each person actually bought, counting only
 * positively priced items: weighting by the net breaks once discounts are
 * involved, since a group total at or below zero has no meaningful proportion,
 * and one person's positive share against a negative group total inverts,
 * handing them a negative slice of the tax. When nothing has been assigned a
 * charge yet — the one case with nothing to proportion by — tax and tip fall
 * back to an even split across all participants.
 */
export function computeBreakdowns(
  items: Item[],
  participants: Participant[],
  tax: number,
  tip: number,
): BillBreakdown {
  const subtotals: Record<string, number> = {};
  const weights: Record<string, number> = {};
  let subtotal = 0;
  let totalWeight = 0;

  for (const item of items) {
    const price = itemTotal(item);
    subtotal += price;
    const assigned = item.splitBetween;
    if (assigned.length === 0) continue;
    const share = price / assigned.length;
    for (const pid of assigned) {
      subtotals[pid] = (subtotals[pid] ?? 0) + share;
      if (price > 0) weights[pid] = (weights[pid] ?? 0) + share;
    }
    if (price > 0) totalWeight += price;
  }

  const breakdowns: PersonBreakdown[] = participants.map((p) => {
    const sub = subtotals[p.id] ?? 0;
    const proportion =
      totalWeight > 0
        ? (weights[p.id] ?? 0) / totalWeight
        : 1 / participants.length;
    const myItems: BreakdownLine[] = items
      .filter((i) => i.splitBetween.includes(p.id))
      .map((i) => ({
        name: i.name,
        amount: itemTotal(i) / i.splitBetween.length,
        children: (i.children ?? []).map((c) => ({
          name: c.name,
          amount: isNaN(c.price) ? 0 : c.price / i.splitBetween.length,
        })),
      }));
    const taxShare = tax * proportion;
    const tipShare = tip * proportion;
    return {
      participant: p,
      itemsTotal: sub,
      taxShare,
      tipShare,
      total: sub + taxShare + tipShare,
      myItems,
    };
  });

  return { breakdowns, subtotal, grandTotal: subtotal + tax + tip };
}
