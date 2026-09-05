import { useCallback, useEffect, useRef, useState } from "react";
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
/** Keeps a zoom that is already sitting exactly on a step from skipping one. */
const STEP_EPSILON = 1e-6;

/** Where the frame was scrolled, and where the pointer was, when a drag began. */
interface DragOrigin {
  pointerX: number;
  pointerY: number;
  scrollLeft: number;
  scrollTop: number;
}

/** A viewport point a zoom is anchored to, so the content under it stays put. */
interface Focal {
  x: number;
  y: number;
}

function touchGap(touches: TouchList): number {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  );
}

function touchMidpoint(touches: TouchList): Focal {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
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
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<DragOrigin | null>(null);
  /** The rendered zoom — whole percentage points, matching the readout. */
  const zoomRef = useRef(MIN_ZOOM);
  /**
   * The unrounded zoom a gesture is working from. Pinch deltas arrive well
   * under a percentage point at a time, so continuing from the rendered value
   * would round each one away and leave the gesture feeling stuck.
   */
  const gestureZoomRef = useRef(MIN_ZOOM);

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

  /**
   * Zooms to an arbitrary scale, keeping whatever is under `focal` — or the
   * middle of the frame, for the buttons — under it afterwards.
   */
  const zoomTo = useCallback((next: number, focal?: Focal) => {
    const frame = frameRef.current;
    const image = imageRef.current;
    const previous = zoomRef.current;
    const target = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    gestureZoomRef.current = target;
    // Round to whole percentage points so the value always matches the integer
    // in the readout, and a pinch can't leave 137.4% on screen as "137%".
    const scale = Math.round(target * 100) / 100;
    if (!frame || !image || scale === previous) return;

    // clientLeft/clientTop step over the border, since scrollLeft/scrollTop are
    // measured from the padding box.
    const rect = frame.getBoundingClientRect();
    const anchorX = focal
      ? focal.x - rect.left - frame.clientLeft
      : frame.clientWidth / 2;
    const anchorY = focal
      ? focal.y - rect.top - frame.clientTop
      : frame.clientHeight / 2;
    // The image keeps its aspect ratio, so both axes scale by the same factor
    // and one pair of content coordinates repositions the frame on both.
    const contentX = (frame.scrollLeft + anchorX) / previous;
    const contentY = (frame.scrollTop + anchorY) / previous;

    zoomRef.current = scale;
    // Written to the DOM here rather than left to the re-render: the scroll
    // offsets below only mean anything once the image has its new size, and
    // going through state would paint one frame at the stale offset first.
    image.style.width = `${scale * 100}%`;
    frame.scrollLeft = contentX * scale - anchorX;
    frame.scrollTop = contentY * scale - anchorY;
    setZoom(scale);
  }, []);

  /**
   * Moves one notch along the step grid. A pinch can land anywhere, so this
   * snaps rather than adds: 137% goes to 150% or 100%, not 187% or 87%.
   */
  const stepZoom = useCallback(
    (direction: 1 | -1) => {
      const steps =
        direction > 0
          ? Math.floor(zoomRef.current / ZOOM_STEP + STEP_EPSILON) + 1
          : Math.ceil(zoomRef.current / ZOOM_STEP - STEP_EPSILON) - 1;
      zoomTo(steps * ZOOM_STEP);
    },
    [zoomTo],
  );

  // Pinch zoom, from a trackpad (a ctrl-modified wheel event) or two fingers.
  // Both have to be preventDefault'd or the browser zooms the whole page
  // instead, and React attaches wheel and touchmove passively at the root —
  // where preventDefault is a no-op — so these listeners go on the element.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    function handleWheel(event: WheelEvent) {
      // A plain wheel still scrolls the frame; only the pinch gesture zooms.
      if (!event.ctrlKey) return;
      event.preventDefault();
      // deltaY here is a zoom velocity rather than a distance. Exponentiating
      // it keeps the gesture feeling the same at 100% and at 400%, and the
      // clamp stops one flung event from crossing the whole range.
      const delta = Math.max(-50, Math.min(50, event.deltaY));
      zoomTo(gestureZoomRef.current * Math.exp(-delta / 100), {
        x: event.clientX,
        y: event.clientY,
      });
    }

    // Baselines for the pinch in progress: comparing against where the fingers
    // started, rather than the previous move, keeps rounding from accumulating.
    let startGap = 0;
    let startZoom = MIN_ZOOM;

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length !== 2) return;
      startGap = touchGap(event.touches);
      startZoom = gestureZoomRef.current;
    }

    function handleTouchMove(event: TouchEvent) {
      if (event.touches.length !== 2 || startGap === 0) return;
      event.preventDefault();
      zoomTo(
        (startZoom * touchGap(event.touches)) / startGap,
        touchMidpoint(event.touches),
      );
    }

    function handleTouchEnd(event: TouchEvent) {
      // Lifting either finger ends the pinch; a second one landing again starts
      // a fresh one from the current zoom.
      if (event.touches.length < 2) startGap = 0;
    }

    frame.addEventListener("wheel", handleWheel, { passive: false });
    frame.addEventListener("touchstart", handleTouchStart, { passive: true });
    frame.addEventListener("touchmove", handleTouchMove, { passive: false });
    frame.addEventListener("touchend", handleTouchEnd, { passive: true });
    frame.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    return () => {
      frame.removeEventListener("wheel", handleWheel);
      frame.removeEventListener("touchstart", handleTouchStart);
      frame.removeEventListener("touchmove", handleTouchMove);
      frame.removeEventListener("touchend", handleTouchEnd);
      frame.removeEventListener("touchcancel", handleTouchEnd);
    };
    // The frame is only in the tree once there's an image and the panel is open.
  }, [url, expanded, zoomTo]);

  if (!url) return null;

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
                would outrank the min-[1160px] rail cap above it.

                touch-pan-x/y keeps one-finger scrolling native while handing
                the two-finger pinch to the listeners above; without it the
                browser claims the gesture and page-zooms. */}
            <div
              ref={frameRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className={[
                "thin-scrollbar touch-pan-x touch-pan-y overflow-auto overscroll-contain rounded-xl border border-ctp-surface1/50 bg-white",
                "max-h-[min(55dvh,20rem)] min-[640px]:max-h-[min(60dvh,26rem)] min-[1024px]:max-h-[min(65dvh,32rem)]",
                "min-[1160px]:max-h-[calc(100dvh-11rem)]",
                dragging ? "cursor-grabbing select-none" : "cursor-grab",
              ].join(" ")}
            >
              <img
                ref={imageRef}
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
                onClick={() => stepZoom(-1)}
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
                onClick={() => stepZoom(1)}
                disabled={zoom >= MAX_ZOOM}
                className="rounded-md p-1.5 text-ctp-subtext0 transition-colors hover:bg-ctp-surface1 hover:text-ctp-text disabled:opacity-40 disabled:hover:bg-transparent"
                title="Zoom in"
              >
                <MdAdd size={16} />
              </button>
              <button
                type="button"
                onClick={() => zoomTo(MIN_ZOOM)}
                disabled={zoom === MIN_ZOOM}
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
