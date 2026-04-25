import { MdRestartAlt, MdShare } from "react-icons/md";

interface CTABarProps {
  title: string;
  setTitle: (t: string) => void;
  onShare: () => void;
  onReset: () => void;
  sharing: boolean;
  readOnly?: boolean;
}

export function CTABar({
  title,
  setTitle,
  onShare,
  onReset,
  sharing,
  readOnly = false,
}: CTABarProps) {
  return (
    <div className="flex flex-row items-center gap-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Bill title"
        readOnly={readOnly}
        className="w-0 flex-1 rounded-lg border border-ctp-surface2 bg-ctp-surface0 px-3 py-2 text-2xl font-bold text-ctp-text placeholder-ctp-overlay0 focus:border-ctp-teal focus:outline-none focus:ring-1 focus:ring-ctp-teal/50"
      />
      <div className="flex shrink-0 flex-row gap-2">
        <button
          type="button"
          onClick={onShare}
          disabled={sharing}
          title="Share bill"
          className="flex items-center gap-1.5 rounded-lg border border-ctp-surface1/50 bg-ctp-surface0 px-3 py-2 text-sm text-ctp-subtext1 transition-colors hover:border-ctp-teal/50 hover:bg-ctp-surface1 hover:text-ctp-teal disabled:opacity-50"
        >
          <MdShare size={18} />
          <span className="hidden sm:inline">{sharing ? "Sharing…" : "Share"}</span>
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={onReset}
            title="Clear bill"
            className="flex items-center gap-1.5 rounded-lg border border-ctp-surface1/50 bg-ctp-surface0 px-3 py-2 text-sm text-ctp-subtext1 transition-colors hover:border-ctp-red/50 hover:bg-ctp-surface1 hover:text-ctp-red"
          >
            <MdRestartAlt size={18} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
