# Receipt preview

Shows the scanned receipt beside the parsed bill so totals can be cross-checked
against the source — the guard against the model's plausible-looking
transcription errors.

## Storage

The normalized JPEG (the same bytes the model read) is stored in **IndexedDB**,
keyed by bill id — [`utils/receiptStore.ts`](../app/splitter/utils/receiptStore.ts).

IndexedDB rather than localStorage because:

- Images would have to be base64'd into localStorage, inflating them ~33%.
- Bills live under a single localStorage key rewritten whole on every save. A
  receipt pushing that over quota wouldn't just lose the image — it would fail
  the write and silently stop persisting the bill list. A separate store can't
  take the bills down with it, and holds Blobs natively.

Every failure in the store is swallowed: the image is a convenience, and losing
it must never interfere with splitting the bill. On a rescan, `receiptVersion`
is bumped so the preview re-reads (the bill id is unchanged).

## Display — [`components/ReceiptPreview.tsx`](../app/splitter/components/ReceiptPreview.tsx)

Takes **either** a local `billId` (reads IndexedDB) **or** a remote `imageUrl`
(a shared receipt, streamed from the server — see
[receipt-sharing.md](receipt-sharing.md)). Both resolve to a Blob and go through
the same trim-and-zoom path. The shared URL is same-origin, so the trim's canvas
isn't tainted.

### Whitespace trim (display only)

[`utils/trimReceipt.ts`](../app/splitter/utils/trimReceipt.ts) crops uniform
whitespace **for display only** — the stored blob the model reads is untouched.
Rasterizing a PDF paints a narrow receipt column onto a full letter-size page,
so the preview was mostly blank paper with the receipt rendered tiny.

- Detection runs on a downscaled (320px-wide) probe for speed and speck-
  tolerance, then the bounds are mapped back and cropped at full resolution.
- A row/column counts as content only with a **minimum run of ink**, so a stray
  speck can't anchor the crop (a bug that bit the earlier OCR-time attempt).
- Bails to the original on: a non-white corner (a photo — don't guess where the
  receipt ends on a dark surface), an all-blank image, or nothing worth
  trimming. Any failure returns the original — showing too much beats showing
  nothing.

> Trimming for OCR accuracy was tried and **deliberately reverted** — a mis-crop
> that clipped a price is a correctness bug. Trimming for _display_ has no such
> stakes (worst case: a sliver of margin), which is why it's back here and
> nowhere near the stored image.

### In-place zoom

There's **no fullscreen modal** (it was removed). The inline frame is a scrollable
container; a control pill (`−` / live `%` / `+` / reset) is overlaid on the
top-right, positioned outside the scroll container so it stays pinned as the
image moves. Zooming widens the image past the frame, so **panning is just
scrolling** — which works natively on touch, no JS. `overscroll-contain` stops a
swipe past the edge from scrolling the page behind it.

On wide screens the frame fills the viewport height (`max-h-[calc(100vh-11rem)]`)
instead of a fixed cap, so a trimmed receipt is legible next to the items.

Scrollbars use the `thin-scrollbar` utility in [`app/app.css`](../app/app.css)
(4px WebKit, `scrollbar-width: thin` for Firefox, a neutral grey thumb that
reads over the white receipt).
