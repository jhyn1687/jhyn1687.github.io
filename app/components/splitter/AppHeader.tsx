import { MdCameraAlt, MdMenu, MdShare } from "react-icons/md";

interface AppHeaderProps {
  title: string;
  setTitle: (t: string) => void;
  onShare: () => void;
  onMobileMenu: () => void;
  onMobileScan: () => void;
  sharing: boolean;
  readOnly?: boolean;
}

export function AppHeader({
  title,
  setTitle,
  onShare,
  onMobileMenu,
  onMobileScan,
  sharing,
  readOnly = false,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-ctp-surface1/50 bg-ctp-base/85 px-4 backdrop-blur-md sm:px-6">
      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={onMobileMenu}
        className="shrink-0 rounded-lg p-1.5 text-ctp-subtext1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text md:hidden"
        aria-label="Open menu"
      >
        <MdMenu size={20} />
      </button>

      {/* Bill title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled Bill"
        readOnly={readOnly}
        className="min-w-0 flex-1 bg-transparent font-mono text-lg font-bold text-ctp-text placeholder-ctp-overlay0 focus:outline-none"
      />

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Scan — mobile only */}
        {!readOnly && (
          <button
            type="button"
            onClick={onMobileScan}
            className="flex items-center gap-1.5 rounded-full border border-ctp-surface1/50 bg-ctp-surface0 px-3 py-1.5 text-xs font-bold text-ctp-subtext1 transition-colors hover:border-ctp-teal/50 hover:text-ctp-teal md:hidden"
          >
            <MdCameraAlt size={14} />
            Scan
          </button>
        )}

        <button
          type="button"
          onClick={onShare}
          disabled={sharing}
          title="Share bill"
          className="flex items-center gap-1.5 rounded-full border border-ctp-surface1/50 bg-ctp-surface0 px-3 py-1.5 text-xs font-semibold text-ctp-subtext1 transition-colors hover:border-ctp-teal/50 hover:bg-ctp-surface1 hover:text-ctp-teal disabled:opacity-50"
        >
          <MdShare size={14} />
          <span>{sharing ? "Sharing…" : "Share"}</span>
        </button>
      </div>
    </header>
  );
}
