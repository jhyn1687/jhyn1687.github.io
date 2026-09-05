import { useEffect, useRef, useState } from "react";
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

/** Where the frame was scrolled, and where the pointer was, when a drag began. */
interface DragOrigin {
  pointerX: number;
  pointerY: number;
  scrollLeft: number;
  scrollTop: number;
}

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
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragOrigin | null>(null);

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

  // Touch already pans the frame natively, with momentum and rubber-banding, so
  // only mouse and pen are taken over — there a drag would otherwise do nothing
  // but select the image.
  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    if (!frame || event.pointerType === "touch" || event.button !== 0) return;
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      scrollLeft: frame.scrollLeft,
      scrollTop: frame.scrollTop,
    };
    // Capture so a drag that leaves the frame keeps panning until the release.
    frame.setPointerCapture(event.pointerId);
    setDragging(true);
    event.preventDefault();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const origin = dragRef.current;
    const frame = frameRef.current;
    if (!origin || !frame) return;
    // The content follows the pointer, so the scroll offset moves against it.
    frame.scrollLeft = origin.scrollLeft - (event.clientX - origin.pointerX);
    frame.scrollTop = origin.scrollTop - (event.clientY - origin.pointerY);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    const frame = frameRef.current;
    if (frame?.hasPointerCapture(event.pointerId)) {
      frame.releasePointerCapture(event.pointerId);
    }
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
                just scrolling. The cap grows with the screen but stays a share
                of the viewport, so a short window (a landscape phone) never
                gives the receipt the whole page. On a wide screen the rail is
                tall and narrow, so let it fill the viewport height instead.
                The steps are all min-[…] rather than sm:/lg: — Tailwind emits
                named breakpoints after arbitrary ones, so a named lg: step
                would outrank the min-[1160px] rail cap above it. */}
            <div
              ref={frameRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className={[
                "thin-scrollbar overflow-auto overscroll-contain rounded-xl border border-ctp-surface1/50 bg-white",
                "max-h-[min(55dvh,20rem)] min-[640px]:max-h-[min(60dvh,26rem)] min-[1024px]:max-h-[min(65dvh,32rem)]",
                "min-[1160px]:max-h-[calc(100dvh-11rem)]",
                dragging ? "cursor-grabbing select-none" : "cursor-grab",
              ].join(" ")}
            >
              <img
                src={url}
                alt="Scanned receipt"
                style={{ width: `${zoom * 100}%` }}
                // Native image dragging would start its own drag-and-drop and
                // swallow the pan.
                draggable={false}
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
            Zoom in and drag to compare with the items
          </p>
        </div>
      )}
    </div>
  );
}
