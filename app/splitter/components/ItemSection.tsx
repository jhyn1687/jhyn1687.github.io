import { useRef, useState } from "react";
import { MdWarning } from "react-icons/md";
import { ItemRow } from "./ItemRow";
import type { Item, Participant } from "~/splitter/types";

interface ItemSectionProps {
  items: Item[];
  participants: Participant[];
  onAdd: (name: string, price: number) => void;
  onItemChange: (id: string, patch: Partial<Item>) => void;
  onItemRemove: (id: string) => void;
  readOnly?: boolean;
  showError?: boolean;
}

export function ItemSection({
  items,
  participants,
  onAdd,
  onItemChange,
  onItemRemove,
  readOnly = false,
  showError = false,
}: ItemSectionProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [warningOpen, setWarningOpen] = useState(false);
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

  const noItemsError = showError && items.length === 0;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2
          className={[
            "text-lg font-bold",
            noItemsError ? "text-ctp-red" : "text-ctp-text",
          ].join(" ")}
        >
          Items
        </h2>

        {unassignedCount > 0 && items.length > 0 && (
          <div className="relative ml-auto">
            <button
              type="button"
              onMouseEnter={() => setWarningOpen(true)}
              onMouseLeave={() => setWarningOpen(false)}
              onFocus={() => setWarningOpen(true)}
              onBlur={() => setWarningOpen(false)}
              aria-label={`${unassignedCount} item${unassignedCount > 1 ? "s" : ""} not assigned to anyone`}
              className="flex items-center rounded p-0.5 text-ctp-peach transition-colors"
            >
              <MdWarning size={16} />
            </button>
            {warningOpen && (
              <div className="absolute right-0 top-full z-10 mt-1.5 w-max max-w-48 rounded-lg border border-ctp-peach/30 bg-ctp-mantle px-3 py-2 text-[12px] text-ctp-peach shadow-md">
                {unassignedCount} item{unassignedCount > 1 ? "s" : ""} not
                assigned to anyone
              </div>
            )}
          </div>
        )}
      </div>

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
                splitEvenly: updated.splitEvenly,
              })
            }
            onItemRemove={() => onItemRemove(item.id)}
            readOnly={readOnly}
          />
        ))}
      </div>

      {!readOnly && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Item name…"
              className={[
                "flex-1 rounded-lg border bg-ctp-surface0 px-3 py-2 text-sm text-ctp-text placeholder-ctp-overlay0 focus:outline-none",
                noItemsError
                  ? "border-ctp-red/60 focus:border-ctp-red focus:ring-1 focus:ring-ctp-red/30"
                  : "border-ctp-surface1/50 focus:border-ctp-teal focus:ring-1 focus:ring-ctp-teal/30",
              ].join(" ")}
            />
            <div
              className={[
                "flex items-center rounded-lg border px-2.5",
                noItemsError
                  ? "border-ctp-red/60 bg-ctp-surface0 focus-within:border-ctp-red focus-within:ring-1 focus-within:ring-ctp-red/30"
                  : "border-ctp-surface1/50 bg-ctp-surface0 focus-within:border-ctp-teal focus-within:ring-1 focus-within:ring-ctp-teal/30",
              ].join(" ")}
            >
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
          {noItemsError && (
            <p className="text-xs font-medium text-ctp-red">
              Add at least one item to share this bill
            </p>
          )}
        </div>
      )}
    </section>
  );
}
