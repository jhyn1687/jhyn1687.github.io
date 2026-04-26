import { MdCameraAlt, MdMenu, MdShare } from "react-icons/md";

interface AppHeaderProps {
  title: string;
  setTitle: (t: string) => void;
  onShare: () => void;
  onMobileMenu: () => void;
  onMobileScan: () => void;
  sharing: boolean;
  shareBlocker?: string; // set when Share should be disabled; describes what's missing
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
  readOnly = false,
}: AppHeaderProps) {
  const shareDisabled = sharing || !!shareBlocker;

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

        <div className="group relative">
          <button
            type="button"
            onClick={shareDisabled ? undefined : onShare}
            disabled={shareDisabled}
            title={shareBlocker ?? "Share bill"}
            className={[
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              shareDisabled
                ? "cursor-not-allowed border-ctp-surface1/50 bg-ctp-surface0 text-ctp-overlay0 opacity-60"
                : "border-ctp-surface1/50 bg-ctp-surface0 text-ctp-subtext1 hover:border-ctp-teal/50 hover:bg-ctp-surface1 hover:text-ctp-teal",
            ].join(" ")}
          >
            <MdShare size={14} />
            <span>{sharing ? "Sharing…" : "Share"}</span>
          </button>

          {/* Tooltip shown when blocked */}
          {shareBlocker && !sharing && (
            <div className="pointer-events-none absolute right-0 top-full mt-2 w-max max-w-[180px] rounded-lg border border-ctp-surface1/50 bg-ctp-surface0 px-3 py-2 text-xs text-ctp-subtext1 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {shareBlocker}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
