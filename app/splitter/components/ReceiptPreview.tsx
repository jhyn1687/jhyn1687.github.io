import { useEffect, useState } from "react";
import { MdAdd, MdChevronRight, MdRefresh, MdRemove } from "react-icons/md";
import { getReceipt } from "~/splitter/utils/receiptStore";
import { trimReceiptWhitespace } from "~/splitter/utils/trimReceipt";

interface ReceiptPreviewProps {
  /** Local draft: the receipt lives in IndexedDB under this bill id. */
  billId?: string | null;
  /** Shared view: the receipt is streamed from this URL instead. */
  imageUrl?: string | null;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

/** Fetches a same-origin URL to a Blob so it can go through the same trim path. */
async function fetchBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
}

/** Shows the scanned receipt beside the parsed items so totals can be checked against it. */
export function ReceiptPreview({ billId, imageUrl }: ReceiptPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    // No synchronous setUrl(null) here — the previous run's cleanup already
    // cleared it, and setting state in the effect body trips react-hooks rules.
    if (!billId && !imageUrl) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    // Both sources resolve to a Blob, so a shared receipt gets the same
    // whitespace trim as a local one. The proxy URL is same-origin, so the
    // canvas the trim uses isn't tainted.
    const source: Promise<Blob | null> = imageUrl
      ? fetchBlob(imageUrl)
      : getReceipt(billId as string);

    source
      // Trim whitespace for display only; the stored blob is untouched. Falls
      // back to the original inside the util on any failure.
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
  }, [billId, imageUrl]);

  if (!url) return null;

  function changeZoom(next: number) {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)));
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
          {/* Positioning context so the zoom pill can float over the frame
              without scrolling away with the image. */}
          <div className="relative">
            {/* The frame scrolls; zooming widens the image past it so panning is
                just scrolling. On a wide screen the rail is tall and narrow, so
                let it fill the viewport height rather than capping it short. */}
            <div className="thin-scrollbar max-h-80 overflow-auto overscroll-contain rounded-xl border border-ctp-surface1/50 bg-white min-[1160px]:max-h-[calc(100vh-11rem)]">
              <img
                src={url}
                alt="Scanned receipt"
                style={{ width: `${zoom * 100}%` }}
                className="block h-auto max-w-none"
              />
            </div>

            {/* Zoom controls, overlaid top-right of the image. */}
            <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-lg border border-ctp-surface1/50 bg-ctp-base/90 p-0.5 shadow-md backdrop-blur-sm">
              <button
                type="button"
                onClick={() => changeZoom(zoom - ZOOM_STEP)}
                disabled={zoom <= MIN_ZOOM}
                className="rounded-md p-1.5 text-ctp-subtext0 transition-colors hover:bg-ctp-surface1 hover:text-ctp-text disabled:opacity-40 disabled:hover:bg-transparent"
                title="Zoom out"
              >
                <MdRemove size={16} />
              </button>
              <span className="w-10 text-center text-xs tabular-nums text-ctp-subtext0">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => changeZoom(zoom + ZOOM_STEP)}
                disabled={zoom >= MAX_ZOOM}
                className="rounded-md p-1.5 text-ctp-subtext0 transition-colors hover:bg-ctp-surface1 hover:text-ctp-text disabled:opacity-40 disabled:hover:bg-transparent"
                title="Zoom in"
              >
                <MdAdd size={16} />
              </button>
              <button
                type="button"
                onClick={() => changeZoom(1)}
                disabled={zoom === 1}
                className="rounded-md p-1.5 text-ctp-subtext0 transition-colors hover:bg-ctp-surface1 hover:text-ctp-text disabled:opacity-40 disabled:hover:bg-transparent"
                title="Reset zoom"
              >
                <MdRefresh size={16} />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-ctp-overlay0">
            Zoom in to compare with the items
          </p>
        </div>
      )}
    </div>
  );
}
