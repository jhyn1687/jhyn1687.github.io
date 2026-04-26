import { useRef, useState } from "react";
import { ItemRow } from "./ItemRow";
import type { Item, Participant } from "./types";
import type { OcrItem } from "./parseReceiptText";

interface ItemSectionProps {
  items: Item[];
  participants: Participant[];
  onAdd: (name: string, price: number) => void;
  onItemChange: (id: string, patch: Partial<Item>) => void;
  onItemRemove: (id: string) => void;
  readOnly?: boolean;
}

export function ItemSection({
  items,
  participants,
  onAdd,
  onItemChange,
  onItemRemove,
  readOnly = false,
}: ItemSectionProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const n = name.trim();
    if (!n) return;
    const p = parseFloat(price);
    onAdd(n, isNaN(p) ? 0 : p);
    setName("");
    setPrice("");
    nameRef.current?.focus();
  }

  const unassignedCount = items.filter(
    (i) => i.splitBetween.length === 0,
  ).length;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ctp-teal text-[11px] font-bold text-ctp-base">
          2
        </span>
        <h2 className="text-lg font-bold text-ctp-text">Items</h2>
        {items.length > 0 && (
          <span className="ml-auto rounded-full bg-ctp-surface1/50 px-2.5 py-0.5 text-xs font-semibold text-ctp-subtext0">
            {items.length}
          </span>
        )}
      </div>

      {unassignedCount > 0 && items.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-ctp-yellow/30 bg-ctp-yellow/10 px-3.5 py-2.5 text-[12px] text-ctp-yellow">
          ⚠{" "}
          {unassignedCount} item{unassignedCount > 1 ? "s" : ""} not assigned to anyone
        </div>
      )}

      {items.length === 0 && (
        <p className="text-sm text-ctp-overlay0">
          {readOnly ? "No items." : "Add items below or upload a receipt."}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            participants={participants}
            onItemChange={(updated) =>
              onItemChange(updated.id, {
                name: updated.name,
                price: updated.price,
                splitBetween: updated.splitBetween,
              })
            }
            onItemRemove={() => onItemRemove(item.id)}
            readOnly={readOnly}
          />
        ))}
      </div>

      {!readOnly && (
        <div className="flex gap-2">
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Item name…"
            className="flex-1 rounded-lg border border-ctp-surface1/50 bg-ctp-surface0 px-3 py-2 text-sm text-ctp-text placeholder-ctp-overlay0 focus:border-ctp-teal focus:outline-none focus:ring-1 focus:ring-ctp-teal/30"
          />
          <div className="flex items-center rounded-lg border border-ctp-surface1/50 bg-ctp-surface0 px-2.5 focus-within:border-ctp-teal focus-within:ring-1 focus-within:ring-ctp-teal/30">
            <span className="text-xs font-semibold text-ctp-overlay0">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="0.00"
              className="w-20 bg-transparent py-2 pl-1 pr-2 text-right text-sm text-ctp-text placeholder-ctp-overlay0 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim()}
            className="rounded-lg bg-ctp-teal px-4 py-2 text-sm font-semibold text-ctp-base transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      )}
    </section>
  );
}
