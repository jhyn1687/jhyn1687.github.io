import { ParticipantTile } from "./ParticipantTile";
import type { Item, Participant } from "./types";

interface BillBreakdownProps {
  items: Item[];
  participants: Participant[];
}

export function BillBreakdown({ items, participants }: BillBreakdownProps) {
  if (participants.length === 0) {
    return (
      <p className="text-sm text-ctp-overlay0">
        Add participants to see the breakdown.
      </p>
    );
  }

  const breakdown = participants.map((p) => ({
    participant: p,
    owes: items.reduce((sum, item) => {
      if (isNaN(item.price) || item.splitBetween.length === 0) return sum;
      if (item.splitBetween.includes(p.id)) {
        return sum + item.price / item.splitBetween.length;
      }
      return sum;
    }, 0),
  }));

  const total = items.reduce(
    (sum, item) => sum + (isNaN(item.price) ? 0 : item.price),
    0,
  );

  return (
    <div className="flex flex-col gap-2">
      {breakdown.map(({ participant, owes }) => (
        <ParticipantTile
          key={participant.id}
          participant={participant}
          priceAmount={owes}
        />
      ))}
      {total > 0 && (
        <div className="mt-2 flex justify-between border-t border-ctp-surface1/50 pt-3 text-sm">
          <span className="text-ctp-subtext1">Total</span>
          <span className="font-bold text-ctp-text">${total.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
