import { useState } from "react";
import { MdExpandMore, MdReceipt } from "react-icons/md";
import type { Item, Participant } from "~/splitter/types";
import { itemTotal } from "~/splitter/utils/bill";

interface BillSummaryProps {
  items: Item[];
  participants: Participant[];
  tax: number;
  tip: number;
}

interface PersonBreakdown {
  participant: Participant;
  itemsTotal: number;
  taxShare: number;
  tipShare: number;
  total: number;
  myItems: Array<{
    name: string;
    amount: number;
    children: Array<{ name: string; amount: number }>;
  }>;
}

function PersonCard({ bd }: { bd: PersonBreakdown }) {
  const [open, setOpen] = useState(false);
  const { participant: p, total, itemsTotal, taxShare, tipShare, myItems } = bd;

  return (
    <div className="overflow-hidden rounded-xl border border-ctp-surface1/50 transition-colors hover:border-ctp-surface2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${p.color.avatar}`}
        >
          {p.name[0]?.toUpperCase() ?? "?"}
        </div>
        <span className="flex-1 truncate font-semibold text-ctp-text">
          {p.name}
        </span>
        <span
          className={`shrink-0 font-mono text-base font-bold ${p.color.text}`}
        >
          ${total.toFixed(2)}
        </span>
        <MdExpandMore
          size={18}
          className={[
            "shrink-0 text-ctp-overlay0 transition-transform duration-150",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-1.5 border-t border-ctp-surface1/50 bg-ctp-mantle/50 px-4 py-3 text-[12px]">
          {myItems.map((item, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className="flex justify-between">
                <span className="truncate text-ctp-subtext1">
                  {item.name || "Unnamed"}
                </span>
                <span className="ml-4 shrink-0 font-semibold text-ctp-text">
                  ${item.amount.toFixed(2)}
                </span>
              </div>
              {item.children.map((child, j) => (
                <div key={j} className="flex justify-between pl-3 text-[11px]">
                  <span className="truncate text-ctp-overlay0">
                    {child.name || "Modification"}
                  </span>
                  {/* A no-cost modification is worth showing, but a "$0.00"
                      beside it is just noise. */}
                  {child.amount !== 0 && (
                    <span className="ml-4 shrink-0 text-ctp-overlay0">
                      {child.amount < 0 ? "−" : ""}$
                      {Math.abs(child.amount).toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}

          {myItems.length > 0 && (
            <div className="my-1 h-px bg-ctp-surface1/50" />
          )}

          <div className="flex justify-between text-ctp-subtext0">
            <span>Items subtotal</span>
            <span className="font-semibold">${itemsTotal.toFixed(2)}</span>
          </div>
          {taxShare > 0 && (
            <div className="flex justify-between text-ctp-subtext0">
              <span>Tax</span>
              <span>${taxShare.toFixed(2)}</span>
            </div>
          )}
          {tipShare > 0 && (
            <div className="flex justify-between text-ctp-subtext0">
              <span>Tip</span>
              <span>${tipShare.toFixed(2)}</span>
            </div>
          )}
          <div className="my-1 h-px bg-ctp-surface1/50" />
          <div className={`flex justify-between font-bold ${p.color.text}`}>
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function BillSummary({
  items,
  participants,
  tax,
  tip,
}: BillSummaryProps) {
  // Compute per-participant subtotals
  const subtotals: Record<string, number> = {};
  // Tax and tip are apportioned by what each person actually bought, counting
  // only positively priced items. Weighting by the net instead breaks once
  // discounts are involved: a group total at or below zero has no meaningful
  // proportion, and one person's positive share against a negative group total
  // inverts, handing them a negative share of the tax.
  const weights: Record<string, number> = {};
  let totalSubtotal = 0;
  let totalWeight = 0;

  for (const item of items) {
    const price = itemTotal(item);
    totalSubtotal += price;
    const assigned = item.splitBetween;
    if (assigned.length === 0) continue;
    const share = price / assigned.length;
    for (const pid of assigned) {
      subtotals[pid] = (subtotals[pid] ?? 0) + share;
      if (price > 0) weights[pid] = (weights[pid] ?? 0) + share;
    }
    if (price > 0) totalWeight += price;
  }

  const grandTotal = totalSubtotal + tax + tip;
  const hasData = items.length > 0 && participants.length > 0;

  const breakdowns: PersonBreakdown[] = participants.map((p) => {
    const sub = subtotals[p.id] ?? 0;
    // Falls back to an even split only when nobody has been assigned a charge
    // yet, which is the one case with nothing to proportion by.
    const proportion =
      totalWeight > 0
        ? (weights[p.id] ?? 0) / totalWeight
        : 1 / participants.length;
    const myItems = items
      .filter((i) => i.splitBetween.includes(p.id))
      .map((i) => ({
        name: i.name,
        amount: itemTotal(i) / i.splitBetween.length,
        // Shown under the item so a total that doesn't match the receipt line
        // is explained by what modified it.
        children: (i.children ?? []).map((c) => ({
          name: c.name,
          amount: isNaN(c.price) ? 0 : c.price / i.splitBetween.length,
        })),
      }));
    return {
      participant: p,
      itemsTotal: sub,
      taxShare: tax * proportion,
      tipShare: tip * proportion,
      total: sub + tax * proportion + tip * proportion,
      myItems,
    };
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-ctp-surface1/50 bg-ctp-surface0/40 shadow-lg">
      {/* Header */}
      <div className="border-b border-ctp-surface1/50 px-5 py-4">
        <div className="text-[17px] font-extrabold text-ctp-text">
          Bill Summary
        </div>
        <div className="mt-0.5 text-xs text-ctp-overlay0">
          {hasData
            ? `${participants.length} people · ${items.length} items`
            : "Add people and items to get started"}
        </div>
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-3 divide-x divide-ctp-surface1/50 border-b border-ctp-surface1/50">
        {[
          { label: "Subtotal", value: totalSubtotal },
          { label: "Tax + Tip", value: tax + tip },
          { label: "Total", value: grandTotal, accent: true },
        ].map(({ label, value, accent }) => (
          <div key={label} className="flex flex-col items-center py-3">
            <span className="mb-1 text-[11px] font-medium text-ctp-overlay0">
              {label}
            </span>
            <span
              className={[
                "font-mono text-lg font-bold",
                accent ? "text-ctp-teal" : "text-ctp-text",
              ].join(" ")}
            >
              ${value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Per-person */}
      {!hasData ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-ctp-overlay0">
          <MdReceipt size={32} />
          <span className="text-sm">Your breakdown will appear here</span>
          <span className="text-xs">Start by adding people and items</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {breakdowns.map((bd) => (
            <PersonCard key={bd.participant.id} bd={bd} />
          ))}
        </div>
      )}
    </div>
  );
}
