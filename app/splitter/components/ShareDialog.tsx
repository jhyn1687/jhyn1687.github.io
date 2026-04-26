import { MdClose } from "react-icons/md";

interface ShareDialogProps {
  open: boolean;
  sharing: boolean;
  skipShareDialog: boolean;
  onUpdateSkip: (skip: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ShareDialog({
  open,
  sharing,
  skipShareDialog,
  onUpdateSkip,
  onConfirm,
  onCancel,
}: ShareDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-ctp-surface1/50 bg-ctp-base p-6 shadow-2xl">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-ctp-subtext0 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
        >
          <MdClose size={18} />
        </button>

        <h2 className="mb-2 text-lg font-bold text-ctp-text">
          Finalize &amp; Share
        </h2>
        <p className="mb-5 text-sm text-ctp-subtext1">
          This creates a{" "}
          <strong className="text-ctp-text">read-only snapshot</strong> and
          opens the shared view. The bill will no longer appear in your local
          drafts.
        </p>

        <label className="mb-5 flex cursor-pointer items-center gap-2.5 text-sm text-ctp-subtext1">
          <input
            type="checkbox"
            checked={skipShareDialog}
            onChange={(e) => onUpdateSkip(e.target.checked)}
            className="h-4 w-4 accent-[oklch(var(--ctp-teal))]"
          />
          Don't ask again
        </label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-ctp-surface1/50 bg-ctp-surface0 py-2 text-sm text-ctp-subtext1 transition-colors hover:border-ctp-surface2 hover:text-ctp-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={sharing}
            className="flex-1 rounded-lg bg-ctp-teal py-2 text-sm font-semibold text-ctp-base transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {sharing ? "Sharing…" : "Finalize & Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
