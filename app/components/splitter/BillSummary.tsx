import { useState } from "react";
import { MdExpandMore } from "react-icons/md";
import type { Item, Participant } from "./types";

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
  myItems: Array<{ name: string; amount: number }>;
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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ background: p.color.bg, color: p.color.fg }}
        >
          {p.name[0]?.toUpperCase() ?? "?"}
        </div>
        <span className="flex-1 truncate font-semibold text-ctp-text">{p.name}</span>
        <span
          className="shrink-0 font-mono text-base font-bold"
          style={{ color: p.color.fg }}
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
            <div key={i} className="flex justify-between">
              <span className="truncate text-ctp-subtext1">{item.name || "Unnamed"}</span>
              <span className="ml-4 shrink-0 font-semibold text-ctp-text">
                ${item.amount.toFixed(2)}
              </span>
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
          <div
            className="flex justify-between font-bold"
            style={{ color: p.color.fg }}
          >
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function BillSummary({ items, participants, tax, tip }: BillSummaryProps) {
  // Compute per-participant subtotals
  const subtotals: Record<string, number> = {};
  let totalSubtotal = 0;

  for (const item of items) {
    const assigned = item.splitBetween;
    if (assigned.length === 0 || isNaN(item.price)) continue;
    const share = item.price / assigned.length;
    for (const pid of assigned) {
      subtotals[pid] = (subtotals[pid] ?? 0) + share;
    }
    totalSubtotal += item.price;
  }

  const grandTotal = totalSubtotal + tax + tip;
  const hasData = items.length > 0 && participants.length > 0;

  const breakdowns: PersonBreakdown[] = participants.map((p) => {
    const sub = subtotals[p.id] ?? 0;
    const proportion = totalSubtotal > 0 ? sub / totalSubtotal : 1 / participants.length;
    const myItems = items
      .filter((i) => i.splitBetween.includes(p.id) && !isNaN(i.price))
      .map((i) => ({
        name: i.name,
        amount: i.price / i.splitBetween.length,
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
        <div className="text-[17px] font-extrabold text-ctp-text">Bill Summary</div>
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
            <span className="mb-1 text-[11px] font-medium text-ctp-overlay0">{label}</span>
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
          <span className="text-3xl">🍽️</span>
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
