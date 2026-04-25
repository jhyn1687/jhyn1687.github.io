import type { Participant } from "./types";

interface ParticipantTileProps {
  participant: Participant;
  selected?: boolean;
  onClick?: () => void;
  priceAmount?: number;
  readOnly?: boolean;
}

export function ParticipantTile({
  participant,
  selected = false,
  onClick,
  priceAmount,
  readOnly = false,
}: ParticipantTileProps) {
  const clickable = !!onClick && !readOnly;

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={clickable ? onClick : undefined}
      className={[
        "flex w-full flex-row items-center gap-2 rounded-xl border p-3 text-left transition-colors",
        clickable ? "cursor-pointer" : "cursor-default",
        selected
          ? "border-ctp-teal bg-ctp-teal/10"
          : "border-ctp-surface1/50 bg-ctp-surface0/40",
        clickable && !selected ? "hover:border-ctp-teal/50 hover:bg-ctp-teal/5" : "",
      ].join(" ")}
      aria-label={participant.name}
      aria-pressed={clickable ? selected : undefined}
    >
      <div className="flex min-h-8 min-w-8 items-center justify-center rounded-full border border-ctp-teal/40 bg-ctp-teal/20">
        <span className="text-sm font-bold text-ctp-teal">
          {participant.name[0]?.toUpperCase() ?? "?"}
        </span>
      </div>
      <span className="flex-grow truncate font-bold text-ctp-text">
        {participant.name || <span className="text-ctp-overlay0 font-normal">Unnamed</span>}
      </span>
      {priceAmount !== undefined && (
        <span className="shrink-0 font-bold text-ctp-teal">
          ${priceAmount.toFixed(2)}
        </span>
      )}
    </button>
  );
}
