import { useState } from "react";
import { MdDelete, MdDeleteForever } from "react-icons/md";
import { ParticipantTile } from "./ParticipantTile";
import type { Item, Participant } from "./types";

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
  const [isFirstDelete, setIsFirstDelete] = useState(true);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onItemChange({ ...item, name: e.target.value });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onItemChange({ ...item, price: parseFloat(e.target.value) });
  };

  const handleDeleteClick = () => {
    if (isFirstDelete) {
      setIsFirstDelete(false);
      setTimeout(() => setIsFirstDelete(true), 3000);
    } else {
      onItemRemove();
    }
  };

  const toggleParticipant = (pid: string) => {
    const updated = item.splitBetween.includes(pid)
      ? item.splitBetween.filter((id) => id !== pid)
      : [...item.splitBetween, pid];
    onItemChange({ ...item, splitBetween: updated });
  };

  const inputClass =
    "w-full rounded bg-ctp-surface1 px-2 py-1 text-ctp-text placeholder-ctp-overlay0 focus:outline-none focus:ring-1 focus:ring-ctp-teal/50";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 rounded-xl border border-ctp-surface1/50 bg-ctp-surface0/40 p-4">
        <div className="flex flex-row items-center gap-2">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-row items-center gap-2">
              <span className="shrink-0 text-sm text-ctp-subtext1">Name</span>
              <input
                className={inputClass}
                type="text"
                value={item.name}
                onChange={handleNameChange}
                placeholder="Item name"
                readOnly={readOnly}
              />
            </div>
            <div className="flex flex-row items-center gap-2">
              <span className="shrink-0 text-sm text-ctp-subtext1">Price $</span>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={isNaN(item.price) ? "" : item.price}
                onChange={handlePriceChange}
                placeholder="0.00"
                readOnly={readOnly}
              />
            </div>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className={`shrink-0 rounded-lg p-2 transition-colors hover:bg-ctp-surface1 ${isFirstDelete ? "text-ctp-subtext1" : "text-ctp-red"}`}
              title={isFirstDelete ? "Delete item" : "Confirm delete"}
            >
              {isFirstDelete ? (
                <MdDelete size={20} />
              ) : (
                <MdDeleteForever size={20} />
              )}
            </button>
          )}
        </div>
      </div>
      {participants.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {participants.map((p) => (
            <ParticipantTile
              key={p.id}
              participant={p}
              selected={item.splitBetween.includes(p.id)}
              onClick={readOnly ? undefined : () => toggleParticipant(p.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}
