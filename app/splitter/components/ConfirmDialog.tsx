interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Red confirm button for irreversible actions like clearing every item. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A yes/no confirmation, styled to match ReplaceScanDialog. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-ctp-surface1/50 bg-ctp-base p-6 shadow-2xl">
        <h2 className="mb-2 text-lg font-bold text-ctp-text">{title}</h2>
        <p className="mb-5 text-sm text-ctp-subtext1">{message}</p>

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
            className={[
              "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90",
              destructive
                ? "bg-ctp-red text-ctp-base"
                : "bg-ctp-teal text-ctp-base",
            ].join(" ")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
