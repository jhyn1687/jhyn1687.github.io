interface ReplaceScanDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shown when scanning onto a bill that already has items. A bill holds one
 * receipt, so the new scan replaces everything — including any edits made by
 * hand since the last one, which is the part worth warning about.
 */
export function ReplaceScanDialog({
  open,
  onConfirm,
  onCancel,
}: ReplaceScanDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-ctp-surface1/50 bg-ctp-base p-6 shadow-2xl">
        <h2 className="mb-2 text-lg font-bold text-ctp-text">
          Replace current items?
        </h2>
        <p className="mb-5 text-sm text-ctp-subtext1">
          Scanning a new receipt replaces the items, tax, and tip on this bill.
          Any changes you&apos;ve made by hand will be lost.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-ctp-surface1 px-4 py-2 text-sm font-semibold text-ctp-subtext0 transition-colors hover:bg-ctp-surface0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-ctp-teal px-4 py-2 text-sm font-semibold text-ctp-base transition-opacity hover:opacity-90"
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  );
}
