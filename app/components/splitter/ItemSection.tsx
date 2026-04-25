import { MdAddCircle } from "react-icons/md";
import { ItemRow } from "./ItemRow";
import { ReceiptUpload } from "./ReceiptUpload";
import type { Item, Participant } from "./types";
import type { OcrItem } from "./useBillState";

interface ItemSectionProps {
  items: Item[];
  participants: Participant[];
  onAdd: () => void;
  onItemChange: (id: string, patch: Partial<Item>) => void;
  onItemRemove: (id: string) => void;
  onItemsImported: (items: OcrItem[]) => void;
  readOnly?: boolean;
}

export function ItemSection({
  items,
  participants,
  onAdd,
  onItemChange,
  onItemRemove,
  onItemsImported,
  readOnly = false,
}: ItemSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-row items-center gap-2">
        <h2 className="text-xl font-bold text-ctp-text">Items</h2>
        {!readOnly && (
          <>
            <button
              type="button"
              onClick={onAdd}
              title="Add item"
              className="rounded-full p-1 text-ctp-subtext1 transition-colors hover:bg-ctp-teal/20 hover:text-ctp-teal"
            >
              <MdAddCircle size={22} />
            </button>
            <div className="ml-auto">
              <ReceiptUpload onItemsImported={onItemsImported} />
            </div>
          </>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-ctp-overlay0">
          {readOnly ? "No items." : "Add items or upload a receipt."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
      )}
    </section>
  );
}
