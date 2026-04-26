import type { Participant } from "~/splitter/types";

interface ParticipantTileProps {
  participant: Participant;
  selected?: boolean;
  onClick?: () => void;
  readOnly?: boolean;
}

export function ParticipantTile({
  participant,
  selected = false,
  onClick,
  readOnly = false,
}: ParticipantTileProps) {
  const clickable = !!onClick && !readOnly;

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={clickable ? onClick : undefined}
      className={[
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-all",
        clickable ? "cursor-pointer" : "cursor-default",
        selected
          ? participant.color.chip
          : "border-ctp-surface1 bg-ctp-surface0/40 text-ctp-subtext0",
        clickable && !selected ? "hover:border-ctp-surface2" : "",
      ].join(" ")}
      aria-label={participant.name}
      aria-pressed={clickable ? selected : undefined}
    >
      <div
        className={[
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          selected
            ? participant.color.avatar
            : "bg-ctp-surface1/50 text-ctp-subtext0",
        ].join(" ")}
      >
        {participant.name[0]?.toUpperCase() ?? "?"}
      </div>
      <span>{participant.name.split(" ")[0] || "?"}</span>
    </button>
  );
}
