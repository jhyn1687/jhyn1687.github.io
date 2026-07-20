import { useEffect, useState } from "react";
import { MdChevronRight, MdClose } from "react-icons/md";
import { getReceipt } from "~/splitter/utils/receiptStore";

interface ReceiptPreviewProps {
  billId: string | null;
}

/** Shows the scanned receipt beside the parsed items so totals can be checked against it. */
export function ReceiptPreview({ billId }: ReceiptPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    // No synchronous setUrl(null) here — the previous run's cleanup already
    // cleared it, and setting state in the effect body trips react-hooks rules.
    if (!billId) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    getReceipt(billId).then((blob) => {
      if (!blob || cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [billId]);

  if (!url) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-ctp-surface1/50 bg-ctp-surface0/40">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-ctp-surface0/60"
      >
        <span className="flex-1 text-[15px] font-bold text-ctp-text">
          Scanned Receipt
        </span>
        <MdChevronRight
          size={18}
          className={[
            "shrink-0 text-ctp-overlay0 transition-transform duration-150",
            expanded ? "rotate-90" : "",
          ].join(" ")}
        />
      </button>

      {expanded && (
        <div className="border-t border-ctp-surface1/50 p-4">
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="block w-full overflow-hidden rounded-xl border border-ctp-surface1/50 bg-white"
            title="Tap to enlarge"
          >
            <img
              src={url}
              alt="Scanned receipt"
              className="max-h-80 w-full object-contain object-top"
            />
          </button>
          <p className="mt-2 text-center text-xs text-ctp-overlay0">
            Tap to enlarge and compare with the items
          </p>
        </div>
      )}

      {zoomed && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="absolute right-4 top-4 z-10 rounded-lg bg-ctp-surface0 p-2 text-ctp-text transition-colors hover:bg-ctp-surface1"
            title="Close"
          >
            <MdClose size={20} />
          </button>
          {/* Tall receipts need to scroll rather than shrink to illegibility. */}
          <div className="relative z-10 max-h-full overflow-y-auto rounded-xl bg-white">
            <img
              src={url}
              alt="Scanned receipt"
              className="w-auto max-w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
