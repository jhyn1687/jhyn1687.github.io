import { useState } from "react";
import { MdForkRight, MdMenu, MdShare, MdScanner } from "react-icons/md";

interface AppHeaderProps {
  title: string;
  setTitle: (t: string) => void;
  onShare: () => void;
  onFork?: () => void;
  onMobileMenu: () => void;
  onScanReceipt?: () => void;
  sharing: boolean;
  shareBlocked?: boolean;
  titleError?: boolean;
  readOnly?: boolean;
}

export function AppHeader({
  title,
  setTitle,
  onShare,
  onFork,
  onMobileMenu,
  onScanReceipt,
  sharing,
  shareBlocked = false,
  titleError = false,
  readOnly = false,
}: AppHeaderProps) {
  const [localTitle, setLocalTitle] = useState(title);
  const showTitleError = titleError && !localTitle.trim();

  return (
    <header className="sticky top-0 z-30 flex p-3 items-center gap-3 border-b border-ctp-surface1/50 bg-ctp-base/85 px-4 backdrop-blur-md sm:px-6">
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
        value={localTitle}
        onChange={(e) => setLocalTitle(e.target.value)}
        onBlur={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && setTitle(localTitle)}
        placeholder="Untitled Bill"
        readOnly={readOnly}
        className={[
          "min-w-0 flex-1 rounded bg-transparent px-1 font-mono text-lg font-bold text-ctp-text placeholder-ctp-overlay0 focus:outline-none",
          readOnly ? "cursor-default" : "",
          showTitleError
            ? "border border-ctp-red/60 bg-ctp-red/5 placeholder-ctp-red/60 focus:border-ctp-red focus:ring-1 focus:ring-ctp-red/30"
            : "border border-transparent focus:border-ctp-teal focus:ring-1 focus:ring-ctp-teal/30",
        ].join(" ")}
      />

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Scan Receipt — single-column layout only */}
        {onScanReceipt && (
          <button
            type="button"
            onClick={onScanReceipt}
            title="Scan receipt"
            className="flex items-center gap-1.5 rounded-full border border-ctp-surface1/50 bg-ctp-surface0 px-3 py-1.5 text-xs font-semibold text-ctp-subtext1 transition-colors hover:border-ctp-teal/50 hover:bg-ctp-surface1 hover:text-ctp-teal min-[1160px]:hidden"
          >
            <MdScanner size={14} />
            <span>Scan Receipt</span>
          </button>
        )}

        {/* Fork & Edit — shared view only */}
        {onFork && (
          <button
            type="button"
            onClick={onFork}
            className="flex items-center gap-1.5 rounded-full border border-ctp-teal/40 bg-ctp-teal/10 px-3 py-1.5 text-xs font-semibold text-ctp-teal transition-colors hover:bg-ctp-teal/20"
          >
            <MdForkRight size={14} />
            <span>Fork &amp; Edit</span>
          </button>
        )}

        {/* Share */}
        <button
          type="button"
          onClick={onShare}
          title="Share bill"
          className={[
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            sharing
              ? "cursor-not-allowed border-ctp-surface1/50 bg-ctp-surface0 text-ctp-overlay0 opacity-60"
              : shareBlocked
                ? "border-ctp-surface1/30 bg-ctp-surface0 text-ctp-overlay0 hover:border-ctp-surface1/50 hover:text-ctp-subtext0"
                : "border-ctp-surface1/50 bg-ctp-surface0 text-ctp-subtext1 hover:border-ctp-teal/50 hover:bg-ctp-surface1 hover:text-ctp-teal",
          ].join(" ")}
        >
          <MdShare size={14} />
          <span>
            {sharing ? "Sharing…" : readOnly ? "Share" : "Finalize & Share"}
          </span>
        </button>
      </div>
    </header>
  );
}
