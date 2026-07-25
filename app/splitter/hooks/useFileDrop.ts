import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";

function hasFiles(transfer: DataTransfer | null) {
  return transfer?.types.includes("Files") ?? false;
}

/**
 * Makes an element accept dropped files, and reports whether a file is
 * currently hovering it so the zone can highlight.
 *
 * The window listeners are the other half of the job: a drop that misses the
 * zone otherwise falls through to the browser's default, which navigates away
 * to the file and takes the user's in-progress bill with it. Swallowing those
 * costs nothing and makes a near-miss a no-op instead.
 */
export function useFileDrop(onFile: (file: File) => void) {
  const [dragging, setDragging] = useState(false);
  // dragenter/dragleave also fire crossing between an element and its own
  // children, so count them rather than clearing on the first leave.
  const depth = useRef(0);

  const clear = useCallback(() => {
    depth.current = 0;
    setDragging(false);
  }, []);

  useEffect(() => {
    const swallow = (e: globalThis.DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return;
      e.preventDefault();
      if (e.type === "dragover" && e.dataTransfer) {
        e.dataTransfer.dropEffect = "none";
      }
    };
    window.addEventListener("dragover", swallow);
    window.addEventListener("drop", swallow);
    // A drag that ends anywhere but on the zone — released over the page,
    // cancelled with Escape, dropped outside the window — leaves the zone's
    // last dragenter unmatched. Without these the highlight would stick on.
    window.addEventListener("drop", clear);
    window.addEventListener("dragend", clear);
    return () => {
      window.removeEventListener("dragover", swallow);
      window.removeEventListener("drop", swallow);
      window.removeEventListener("drop", clear);
      window.removeEventListener("dragend", clear);
    };
  }, [clear]);

  // Every handler stops propagation so the window guard above never sees an
  // event the zone itself already handled — otherwise its `dropEffect = "none"`
  // would win and show the user a "can't drop here" cursor over a live target.
  const onDragEnter = useCallback((e: ReactDragEvent) => {
    if (!hasFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    depth.current += 1;
    setDragging(true);
  }, []);

  const onDragOver = useCallback((e: ReactDragEvent) => {
    if (!hasFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDragLeave = useCallback((e: ReactDragEvent) => {
    if (!hasFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: ReactDragEvent) => {
      if (!hasFiles(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      clear();
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile, clear],
  );

  return {
    dragging,
    dropZoneProps: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}
