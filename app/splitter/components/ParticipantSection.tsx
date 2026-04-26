import { useRef, useState } from "react";
import type { Participant } from "~/splitter/types";

interface ParticipantSectionProps {
  participants: Participant[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  readOnly?: boolean;
  showError?: boolean;
}

function Avatar({
  name,
  color,
}: {
  name: string;
  color?: { bg: string; fg: string };
}) {
  const c = color ?? { bg: "oklch(30% 0.02 0)", fg: "oklch(65% 0.02 0)" };
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
      style={{ background: c.bg, color: c.fg }}
    >
      {initial}
    </div>
  );
}

export function ParticipantSection({
  participants,
  onAdd,
  onRemove,
  readOnly = false,
  showError = false,
}: ParticipantSectionProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const name = input.trim();
    if (!name) return;
    onAdd(name);
    setInput("");
    inputRef.current?.focus();
  }

  const hasError = showError && participants.length === 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span
          className={[
            "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-ctp-base",
            hasError ? "bg-ctp-red" : "bg-ctp-teal",
          ].join(" ")}
        >
          1
        </span>
        <h2
          className={[
            "text-lg font-bold",
            hasError ? "text-ctp-red" : "text-ctp-text",
          ].join(" ")}
        >
          People
        </h2>
        {participants.length > 0 && (
          <span className="ml-auto rounded-full bg-ctp-surface1/50 px-2.5 py-0.5 text-xs font-semibold text-ctp-subtext0">
            {participants.length}
          </span>
        )}
      </div>

      {participants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <div
              key={p.id}
              className="group flex items-center gap-1.5 rounded-full border-2 py-1 pl-1.5 pr-2.5 text-[13px] font-medium transition-all"
              style={{
                borderColor: p.color?.bg ?? "#888",
                background: (p.color?.bg ?? "#888") + "26",
              }}
            >
              <Avatar name={p.name} color={p.color} />
              <span style={{ color: p.color?.fg ?? "#aaa" }}>{p.name}</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
                  style={{
                    background: (p.color?.fg ?? "#aaa") + "33",
                    color: p.color?.fg ?? "#aaa",
                  }}
                  aria-label={`Remove ${p.name}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Add a person…"
              className={[
                "flex-1 rounded-lg border bg-ctp-surface0 px-3 py-2 text-sm text-ctp-text placeholder-ctp-overlay0 focus:outline-none",
                hasError
                  ? "border-ctp-red/60 focus:border-ctp-red focus:ring-1 focus:ring-ctp-red/30"
                  : "border-ctp-surface1/50 focus:border-ctp-teal focus:ring-1 focus:ring-ctp-teal/30",
              ].join(" ")}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!input.trim()}
              className="rounded-lg bg-ctp-teal px-4 py-2 text-sm font-semibold text-ctp-base transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Add
            </button>
          </div>
          {hasError && (
            <p className="text-xs font-medium text-ctp-red">
              Add at least one person to share this bill
            </p>
          )}
        </div>
      )}

      {participants.length === 0 && readOnly && (
        <p className="text-sm text-ctp-overlay0">No participants.</p>
      )}
    </section>
  );
}
