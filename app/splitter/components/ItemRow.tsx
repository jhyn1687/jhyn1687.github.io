import { useState } from "react";
import { MdAddCircleOutline, MdClose, MdGroup } from "react-icons/md";
import { ParticipantTile } from "./ParticipantTile";
import type { Item, Participant, SubItem } from "~/splitter/types";
import { itemTotal } from "~/splitter/utils/bill";

interface ItemRowProps {
  item: Item;
  participants: Participant[];
  onItemChange: (item: Item) => void;
  onItemRemove: () => void;
  readOnly?: boolean;
}

export function ItemRow({
  item,
  participants,
  onItemChange,
  onItemRemove,
  readOnly = false,
}: ItemRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onItemRemove();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const toggleParticipant = (pid: string) => {
    const updated = item.splitBetween.includes(pid)
      ? item.splitBetween.filter((id) => id !== pid)
      : [...item.splitBetween, pid];
    onItemChange({ ...item, splitBetween: updated });
  };

  const assignedCount = item.splitBetween.length;
  const total = itemTotal(item);
  // Order-level discounts are negative items, and splitting one is as
  // meaningful as splitting a charge — only a zero price has nothing to show.
  const sharePerPerson =
    assignedCount > 1 && total !== 0 ? total / assignedCount : null;

  const children = item.children ?? [];

  const updateChild = (id: string, patch: Partial<SubItem>) =>
    onItemChange({
      ...item,
      children: children.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });

  const addChild = () =>
    onItemChange({
      ...item,
      // Zero, not NaN: a no-cost modification is a supported case, and NaN
      // round-trips through JSON as null, which is neither blank nor a number.
      children: [...children, { id: crypto.randomUUID(), name: "", price: 0 }],
    });

  const removeChild = (id: string) =>
    onItemChange({ ...item, children: children.filter((c) => c.id !== id) });

  return (
    <div
      className={[
        "overflow-hidden rounded-xl border transition-colors",
        assignedCount === 0
          ? "border-ctp-peach/50 hover:border-ctp-peach/80"
          : "border-ctp-surface1/50 hover:border-ctp-surface2",
      ].join(" ")}
    >
      {/* Top row: name | price | delete */}
      <div className="flex items-center gap-2 px-3.5 py-2.5">
        <input
          className="flex-1 bg-transparent text-[13px] text-ctp-text placeholder-ctp-overlay0 focus:outline-none"
          type="text"
          value={item.name}
          onChange={(e) => onItemChange({ ...item, name: e.target.value })}
          placeholder="Item name"
          readOnly={readOnly}
        />
        {!readOnly && (
          <button
            type="button"
            onClick={addChild}
            className="shrink-0 rounded-lg p-1.5 text-ctp-subtext0 transition-colors hover:bg-ctp-surface1 hover:text-ctp-teal"
            title="Add a modification or discount"
          >
            <MdAddCircleOutline size={16} />
          </button>
        )}
        <div className="flex items-center gap-1 rounded-lg border border-ctp-surface1/50 bg-ctp-surface0 px-2.5 py-1">
          <span className="text-xs font-semibold text-ctp-overlay0">$</span>
          <input
            className="w-16 bg-transparent text-right text-[13px] font-semibold text-ctp-text placeholder-ctp-overlay0 focus:outline-none"
            type="number"
            step="0.01"
            value={isNaN(item.price) ? "" : item.price}
            onChange={(e) =>
              onItemChange({ ...item, price: parseFloat(e.target.value) })
            }
            placeholder="0.00"
            readOnly={readOnly}
          />
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={handleDeleteClick}
            className={[
              "shrink-0 rounded-lg p-1.5 transition-colors",
              confirmDelete
                ? "bg-ctp-red/15 text-ctp-red"
                : "text-ctp-subtext0 hover:bg-ctp-surface1 hover:text-ctp-red",
            ].join(" ")}
            title={confirmDelete ? "Tap again to delete" : "Delete item"}
          >
            <MdClose size={18} />
          </button>
        )}
      </div>

      {/* Sub-items: modifications and item-level discounts, indented under the
          parent so the row reads the way the receipt is printed. */}
      {children.length > 0 && (
        <div className="flex flex-col border-t border-ctp-surface1/30 bg-ctp-mantle/30">
          {children.map((child) => (
            <div
              key={child.id}
              className="flex items-center gap-2 py-1.5 pl-7 pr-3.5"
            >
              <span className="shrink-0 text-ctp-overlay0">↳</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-xs text-ctp-subtext1 placeholder-ctp-overlay0 focus:outline-none"
                type="text"
                value={child.name}
                onChange={(e) =>
                  updateChild(child.id, { name: e.target.value })
                }
                placeholder="Modification or discount"
                readOnly={readOnly}
              />
              {/* A finalized zero-price modification carries no money, so the
                  amount is dropped rather than shown as $0.00. Editing still
                  offers the field, since that's how it stops being zero. */}
              {readOnly ? (
                child.price !== 0 && (
                  <span className="shrink-0 text-xs font-semibold text-ctp-subtext0">
                    {child.price < 0 ? "−" : ""}$
                    {Math.abs(child.price).toFixed(2)}
                  </span>
                )
              ) : (
                <>
                  <div className="flex items-center gap-1 rounded-lg border border-ctp-surface1/40 bg-ctp-surface0/60 px-2 py-0.5">
                    <span className="text-[10px] font-semibold text-ctp-overlay0">
                      $
                    </span>
                    <input
                      className="w-14 bg-transparent text-right text-xs text-ctp-subtext1 placeholder-ctp-overlay0 focus:outline-none"
                      type="number"
                      step="0.01"
                      value={child.price === 0 ? "" : child.price}
                      onChange={(e) =>
                        updateChild(child.id, {
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeChild(child.id)}
                    className="shrink-0 rounded p-1 text-ctp-overlay0 transition-colors hover:bg-ctp-surface1 hover:text-ctp-red"
                    title="Remove"
                  >
                    <MdClose size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assignees strip */}
      <div className="flex min-h-12 flex-wrap items-center gap-2 border-t border-ctp-surface1/50 bg-ctp-mantle/50 px-3.5 py-2">
        {(!readOnly || item.splitEvenly) && (
          <button
            type="button"
            onClick={
              readOnly
                ? undefined
                : () =>
                    onItemChange({ ...item, splitEvenly: !item.splitEvenly })
            }
            disabled={readOnly}
            title={readOnly ? undefined : "Always split among everyone"}
            className={[
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-all",
              item.splitEvenly
                ? "border-ctp-teal/40 bg-ctp-teal/15 text-ctp-teal"
                : "border-ctp-surface1 bg-ctp-surface0/40 text-ctp-subtext0 hover:border-ctp-surface2",
            ].join(" ")}
          >
            <div
              className={[
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                item.splitEvenly ? "bg-ctp-teal/30" : "bg-ctp-surface1",
              ].join(" ")}
            >
              <MdGroup size={12} />
            </div>
            Everyone
          </button>
        )}
        {!item.splitEvenly &&
          (participants.length === 0 ? (
            <span className="text-[11px] italic text-ctp-overlay0">
              Add people first
            </span>
          ) : (
            participants.map((p) => (
              <ParticipantTile
                key={p.id}
                participant={p}
                selected={item.splitBetween.includes(p.id)}
                onClick={readOnly ? undefined : () => toggleParticipant(p.id)}
                readOnly={readOnly}
              />
            ))
          ))}
        {sharePerPerson !== null && (
          <span className="ml-auto text-[11px] text-ctp-subtext0">
            {sharePerPerson < 0 ? "−" : ""}$
            {Math.abs(sharePerPerson).toFixed(2)} each
          </span>
        )}
      </div>
    </div>
  );
}
