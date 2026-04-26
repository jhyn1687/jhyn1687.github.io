import { useState } from "react";
import { MdDelete, MdDeleteForever, MdGroup } from "react-icons/md";
import { ParticipantTile } from "./ParticipantTile";
import type { Item, Participant } from "~/splitter/types";

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
  const sharePerPerson =
    assignedCount > 1 && !isNaN(item.price) && item.price > 0
      ? item.price / assignedCount
      : null;

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
        <div className="flex items-center gap-1 rounded-lg border border-ctp-surface1/50 bg-ctp-surface0 px-2.5 py-1">
          <span className="text-xs font-semibold text-ctp-overlay0">$</span>
          <input
            className="w-16 bg-transparent text-right text-[13px] font-semibold text-ctp-text placeholder-ctp-overlay0 focus:outline-none"
            type="number"
            min="0"
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
              "shrink-0 rounded-lg p-1.5 transition-colors hover:bg-ctp-surface1",
              confirmDelete ? "text-ctp-red" : "text-ctp-subtext0",
            ].join(" ")}
            title={confirmDelete ? "Confirm delete" : "Delete item"}
          >
            {confirmDelete ? (
              <MdDeleteForever size={18} />
            ) : (
              <MdDelete size={18} />
            )}
          </button>
        )}
      </div>

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
            ${sharePerPerson.toFixed(2)} each
          </span>
        )}
      </div>
    </div>
  );
}
