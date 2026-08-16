import type { Bill } from "~/splitter/types";
import { computeBreakdowns } from "~/splitter/utils/bill";

/**
 * Room for the whole list before it collapses into "+N more". Unfurlers
 * truncate hard and mid-word — Discord shows roughly 350 characters of an
 * og:description, Slack ~300 — so the tail is dropped here instead, where a
 * count reads better than half a name. The budget is what governs; the head
 * count is a floor on how many lines a big group is worth scrolling.
 */
const MAX_CHARS = 300;
const MAX_PEOPLE = 12;

export interface ShareMeta {
  /** The bill's name. */
  title: string;
  /** One `Name: $amount` line per person. */
  description: string;
}

/** `$12.34`, with the sign outside the symbol so discounts read as -$3.00. */
export function formatMoney(amount: number): string {
  const safe = isNaN(amount) ? 0 : amount;
  return `${safe < 0 ? "-" : ""}$${Math.abs(safe).toFixed(2)}`;
}

/**
 * Builds the title and description a link preview shows for a shared bill.
 *
 * The point of an unfurl is to answer "what do I owe?" without opening the
 * link, so the per-person totals are the whole payload — one line each, since
 * unfurlers render newlines and a list scans faster than a run-on sentence.
 */
export function buildShareMeta(bill: Bill): ShareMeta {
  const { breakdowns } = computeBreakdowns(
    bill.items,
    bill.participants,
    bill.tax ?? 0,
    bill.tip ?? 0,
  );

  const lines: string[] = [];
  let used = 0;
  for (const b of breakdowns) {
    const line = `${b.participant.name || "Someone"}: ${formatMoney(b.total)}`;
    // Stop on the line that would overflow, but never on the first one — a
    // single absurdly long name is still better shown than replaced by "+1".
    if (lines.length >= MAX_PEOPLE) break;
    if (lines.length > 0 && used + line.length + 1 > MAX_CHARS) break;
    lines.push(line);
    used += line.length + 1;
  }
  const hidden = breakdowns.length - lines.length;
  if (hidden > 0) lines.push(`+${hidden} more`);

  return {
    title: bill.title.trim() || "Shared bill",
    description: lines.join("\n"),
  };
}
