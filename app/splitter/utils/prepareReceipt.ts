/**
 * Turns whatever the user picked — JPEG, PNG, WebP, or PDF — into a single JPEG
 * for the vision model.
 *
 * Cloudflare doesn't document which image formats the model accepts, so rather
 * than gamble on PNG or WebP passing through, everything is re-encoded to JPEG.
 * That also shrinks multi-megabyte phone photos before they reach storage and
 * the network.
 *
 * PDFs get rasterized here too: Workers has no canvas, so it can't be done
 * server-side, and Llama 3.2 vision is trained for one image per request —
 * passing several degrades badly — so pages are stitched into one tall canvas.
 */

import type { PDFDocumentProxy } from "pdfjs-dist";

const MAX_PAGES = 3;
/**
 * Width matters far more than height for legibility — characters have to survive
 * the model's own downscaling. So the height cap is generous enough that a
 * two-page stitch at typical render width isn't shrunk at all, and only a
 * three-page one gives up some resolution.
 */
const MAX_WIDTH = 1400;
const MAX_HEIGHT = 3400;
const RENDER_SCALE = 2;
const JPEG_QUALITY = 0.85;

/**
 * HEIC is deliberately absent. Browsers outside Safari often can't decode it,
 * and leaving it out has a second benefit on iOS: the photo picker transcodes
 * to JPEG when the accept list doesn't name HEIC, whereas including it has been
 * reported to make Safari convert other formats *to* HEIC. Users can still pick
 * their iPhone photos — they just arrive as JPEG.
 */
export const RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export class PdfTooLongError extends Error {
  constructor(public pageCount: number) {
    super(`PDF has ${pageCount} pages`);
    this.name = "PdfTooLongError";
  }
}

/** Thrown when the browser can't decode the file, whatever its extension claims. */
export class UnreadableImageError extends Error {
  constructor(public mimeType: string) {
    super(`Could not decode ${mimeType || "image"}`);
    this.name = "UnreadableImageError";
  }
}

export type PreparedReceipt = { blob: Blob; pageCount: number };

export async function prepareReceipt(file: File): Promise<PreparedReceipt> {
  return file.type === "application/pdf"
    ? preparePdf(file)
    : prepareImage(file);
}

async function prepareImage(file: File): Promise<PreparedReceipt> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new UnreadableImageError(file.type);
  }

  try {
    // An in-range JPEG is already exactly what we'd produce, and re-encoding it
    // would only lose quality a second time.
    const oversized = bitmap.width > MAX_WIDTH || bitmap.height > MAX_HEIGHT;
    if (file.type === "image/jpeg" && !oversized) {
      return { blob: file, pageCount: 1 };
    }
    return { blob: await encode(draw([bitmap])), pageCount: 1 };
  } finally {
    bitmap.close();
  }
}

async function preparePdf(file: File): Promise<PreparedReceipt> {
  const pdfjs = await import("pdfjs-dist");

  // Hand pdfjs a worker we construct ourselves. Pointing `workerSrc` at the
  // file instead makes Vite serve it through its module transform, which
  // injects a /@vite/client import that touches `document` — that throws inside
  // a worker, and pdfjs then hangs forever waiting on the handshake. This
  // `new Worker(new URL(...))` form is a pattern Vite handles as a real worker.
  const worker = new Worker(
    new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
    { type: "module" },
  );
  pdfjs.GlobalWorkerOptions.workerPort = worker;

  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const doc = await loadingTask.promise;

  try {
    if (doc.numPages > MAX_PAGES) throw new PdfTooLongError(doc.numPages);

    // Sequential so only one full-size page canvas is live at a time; with at
    // most three pages there's nothing to gain from rendering them in parallel.
    const pages: HTMLCanvasElement[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      pages.push(await renderPage(doc, i));
    }
    return { blob: await encode(draw(pages)), pageCount: doc.numPages };
  } finally {
    await loadingTask.destroy();
    worker.terminate();
    pdfjs.GlobalWorkerOptions.workerPort = null;
  }
}

async function renderPage(
  doc: PDFDocumentProxy,
  pageNum: number,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get a 2D canvas context");
  // PDFs assume a white page; without this, transparent areas render black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvas, canvasContext: context, viewport }).promise;
  page.cleanup();
  return canvas;
}

type Source = HTMLCanvasElement | ImageBitmap;

/** Stacks sources vertically on a common width, scaled down to fit the size caps. */
function draw(sources: Source[]): HTMLCanvasElement {
  const width = Math.max(...sources.map((s) => s.width));
  const scaled = sources.map((s) => ({
    source: s,
    width,
    height: Math.round(s.height * (width / s.width)),
  }));
  const height = scaled.reduce((sum, s) => sum + s.height, 0);

  const fit = Math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height);
  const out = document.createElement("canvas");
  out.width = Math.round(width * fit);
  out.height = Math.round(height * fit);

  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D canvas context");
  // JPEG has no alpha, so anything transparent would otherwise flatten to black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);

  let y = 0;
  for (const s of scaled) {
    ctx.drawImage(
      s.source,
      0,
      Math.round(y * fit),
      Math.round(s.width * fit),
      Math.round(s.height * fit),
    );
    y += s.height;
  }
  return out;
}

async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("Could not encode the receipt image");
  return blob;
}
