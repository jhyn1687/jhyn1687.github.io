interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: ToggleProps) {
  const track = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctp-teal focus-visible:ring-offset-2 focus-visible:ring-offset-ctp-base",
        checked ? "bg-ctp-teal" : "bg-ctp-surface2",
        disabled ? "cursor-not-allowed opacity-50" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* left-0.5 = 2px base; +translate-x-5 (20px) on → 22px from left, 2px gap each side */}
      <span
        className={[
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );

  if (!label) return track;

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-semibold text-ctp-text">{label}</div>
        {description && (
          <div className="mt-0.5 text-sm text-ctp-subtext0">{description}</div>
        )}
      </div>
      {track}
    </div>
  );
}
