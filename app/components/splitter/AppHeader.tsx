import { MdCameraAlt, MdMenu, MdShare } from "react-icons/md";

interface AppHeaderProps {
  title: string;
  setTitle: (t: string) => void;
  onShare: () => void;
  onMobileMenu: () => void;
  onMobileScan: () => void;
  sharing: boolean;
  shareBlocker?: string;
  titleError?: boolean;
  readOnly?: boolean;
}

export function AppHeader({
  title,
  setTitle,
  onShare,
  onMobileMenu,
  onMobileScan,
  sharing,
  shareBlocker,
  titleError = false,
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
        className={[
          "min-w-0 flex-1 rounded bg-transparent px-1 font-mono text-lg font-bold text-ctp-text placeholder-ctp-overlay0 focus:outline-none",
          titleError
            ? "border border-ctp-red/60 bg-ctp-red/5 placeholder-ctp-red/60 focus:border-ctp-red focus:ring-1 focus:ring-ctp-red/30"
            : "border border-transparent focus:border-ctp-teal focus:ring-1 focus:ring-ctp-teal/30",
        ].join(" ")}
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

        {!readOnly && (
          <div className="group relative">
            <button
              type="button"
              onClick={onShare}
              title={shareBlocker ?? "Share bill"}
              className={[
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                sharing
                  ? "cursor-not-allowed border-ctp-surface1/50 bg-ctp-surface0 text-ctp-overlay0 opacity-60"
                  : "border-ctp-surface1/50 bg-ctp-surface0 text-ctp-subtext1 hover:border-ctp-teal/50 hover:bg-ctp-surface1 hover:text-ctp-teal",
              ].join(" ")}
            >
              <MdShare size={14} />
              <span>{sharing ? "Sharing…" : "Share"}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
