import { useState } from "react";
import { MdAddCircle, MdDelete, MdDeleteForever } from "react-icons/md";
import type { Participant } from "./types";

interface ParticipantSectionProps {
  participants: Participant[];
  onAdd: () => void;
  onUpdate: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  readOnly?: boolean;
}

function ParticipantCard({
  participant,
  onUpdate,
  onRemove,
  readOnly,
}: {
  participant: Participant;
  onUpdate: (name: string) => void;
  onRemove: () => void;
  readOnly: boolean;
}) {
  const [isFirstDelete, setIsFirstDelete] = useState(true);

  const handleDeleteClick = () => {
    if (isFirstDelete) {
      setIsFirstDelete(false);
      setTimeout(() => setIsFirstDelete(true), 3000);
    } else {
      onRemove();
    }
  };

  return (
    <div className="flex flex-row items-center gap-3 rounded-xl border border-ctp-surface1/50 bg-ctp-surface0/40 p-3">
      <div className="flex min-h-9 min-w-9 items-center justify-center rounded-full border border-ctp-teal/40 bg-ctp-teal/20">
        <span className="text-sm font-bold text-ctp-teal">
          {participant.name[0]?.toUpperCase() ?? "?"}
        </span>
      </div>
      <input
        type="text"
        value={participant.name}
        onChange={(e) => onUpdate(e.target.value)}
        placeholder="Name"
        readOnly={readOnly}
        className="flex-1 rounded bg-ctp-surface1 px-2 py-1 font-bold text-ctp-text placeholder-ctp-overlay0 focus:outline-none focus:ring-1 focus:ring-ctp-teal/50"
      />
      {!readOnly && (
        <button
          type="button"
          onClick={handleDeleteClick}
          className={`shrink-0 rounded-lg p-1 transition-colors hover:bg-ctp-surface1 ${isFirstDelete ? "text-ctp-subtext1" : "text-ctp-red"}`}
          title={isFirstDelete ? "Remove participant" : "Confirm remove"}
        >
          {isFirstDelete ? (
            <MdDelete size={18} />
          ) : (
            <MdDeleteForever size={18} />
          )}
        </button>
      )}
    </div>
  );
}

export function ParticipantSection({
  participants,
  onAdd,
  onUpdate,
  onRemove,
  readOnly = false,
}: ParticipantSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-row items-center gap-2">
        <h2 className="text-xl font-bold text-ctp-text">Participants</h2>
        {!readOnly && (
          <button
            type="button"
            onClick={onAdd}
            title="Add participant"
            className="rounded-full p-1 text-ctp-subtext1 transition-colors hover:bg-ctp-teal/20 hover:text-ctp-teal"
          >
            <MdAddCircle size={22} />
          </button>
        )}
      </div>
      {participants.length === 0 ? (
        <p className="text-sm text-ctp-overlay0">
          {readOnly ? "No participants." : "Add participants to get started."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {participants.map((p) => (
            <ParticipantCard
              key={p.id}
              participant={p}
              onUpdate={(name) => onUpdate(p.id, name)}
              onRemove={() => onRemove(p.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </section>
  );
}
