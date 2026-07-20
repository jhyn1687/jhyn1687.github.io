import { useEffect, useState } from "react";
import {
  MdAdd,
  MdChevronRight,
  MdClose,
  MdRefresh,
  MdRemove,
} from "react-icons/md";
import { getReceipt } from "~/splitter/utils/receiptStore";
import { trimReceiptWhitespace } from "~/splitter/utils/trimReceipt";

interface ReceiptPreviewProps {
  billId: string | null;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

/** Shows the scanned receipt beside the parsed items so totals can be checked against it. */
export function ReceiptPreview({ billId }: ReceiptPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    // No synchronous setUrl(null) here — the previous run's cleanup already
    // cleared it, and setting state in the effect body trips react-hooks rules.
    if (!billId) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    getReceipt(billId)
      // Trim whitespace for display only; the stored blob the model read is
      // untouched. Falls back to the original inside the util on any failure.
      .then((blob) => (blob ? trimReceiptWhitespace(blob) : null))
      .then((blob) => {
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

  function changeZoom(next: number) {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)));
  }

  // Reset the scale as the view opens and closes so it never inherits a stale
  // zoom from a previous inspection.
  function openZoom() {
    setZoom(1);
    setZoomed(true);
  }

  function closeZoom() {
    setZoom(1);
    setZoomed(false);
  }

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
            onClick={openZoom}
            className="block w-full overflow-y-auto rounded-xl border border-ctp-surface1/50 bg-white"
            title="Tap to enlarge"
          >
            {/* On a wide screen the rail is tall and narrow, so let the receipt
                fill the viewport height and scroll rather than capping it short.
                The trimmed image fills the width, which is what makes the
                side-by-side actually legible. */}
            <img
              src={url}
              alt="Scanned receipt"
              className="w-full object-contain object-top max-h-80 min-[1160px]:max-h-[calc(100vh-13rem)]"
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
          onClick={closeZoom}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          <button
            type="button"
            onClick={closeZoom}
            className="absolute right-4 top-4 z-20 rounded-lg bg-ctp-surface0 p-2 text-ctp-text transition-colors hover:bg-ctp-surface1"
            title="Close"
          >
            <MdClose size={20} />
          </button>

          {/* Zoom controls stay pinned while the image pans beneath them. */}
          <div
            className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-ctp-surface0 p-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => changeZoom(zoom - ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
              className="rounded-lg p-2 text-ctp-text transition-colors hover:bg-ctp-surface1 disabled:opacity-40"
              title="Zoom out"
            >
              <MdRemove size={20} />
            </button>
            <span className="w-12 text-center text-sm tabular-nums text-ctp-subtext0">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => changeZoom(zoom + ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              className="rounded-lg p-2 text-ctp-text transition-colors hover:bg-ctp-surface1 disabled:opacity-40"
              title="Zoom in"
            >
              <MdAdd size={20} />
            </button>
            <button
              type="button"
              onClick={() => changeZoom(1)}
              disabled={zoom === 1}
              className="rounded-lg p-2 text-ctp-text transition-colors hover:bg-ctp-surface1 disabled:opacity-40"
              title="Reset zoom"
            >
              <MdRefresh size={20} />
            </button>
          </div>

          {/* A fixed frame so zoom is measured against something real. At 100%
              the whole tall receipt fits the height; higher zoom overflows and
              scrolls both ways to pan. */}
          <div
            className="relative z-10 h-[84vh] w-[92vw] overflow-auto rounded-xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={url}
              alt="Scanned receipt"
              style={{ height: `${zoom * 100}%` }}
              className="mx-auto w-auto max-w-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
