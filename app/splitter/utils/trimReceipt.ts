/**
 * Trims uniform whitespace from a receipt image for DISPLAY ONLY. The stored
 * blob the model reads is never touched, so unlike the OCR-time cropping that
 * was tried and reverted, a slightly wrong bound here costs a sliver of margin,
 * never a clipped price.
 *
 * The problem it solves: rasterising a PDF receipt paints a narrow column of
 * text onto a full letter-size page, so the preview fits mostly blank paper and
 * the receipt itself renders tiny. Trimming to the inked region lets it fill
 * the side-by-side rail.
 */

// Below this luminance a pixel counts as ink rather than paper.
const INK_LUMA = 235;
// A photo — dark or coloured background — is left alone; only paper-white
// borders are safe to trim without guessing where the receipt ends.
const PAPER_LUMA = 220;
// Detection runs on a downscaled copy: specks stop mattering and it stays fast.
const DETECT_WIDTH = 320;

function luma(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image decode failed"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Returns a trimmed copy, or the original blob when trimming doesn't apply —
 * a photo, an all-blank image, or one already tight to its content. Any failure
 * returns the original: a preview that shows too much beats one that shows
 * nothing.
 */
export async function trimReceiptWhitespace(blob: Blob): Promise<Blob> {
  try {
    const img = await loadImage(blob);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return blob;

    const scale = Math.min(1, DETECT_WIDTH / w);
    const dw = Math.max(1, Math.round(w * scale));
    const dh = Math.max(1, Math.round(h * scale));

    const probe = document.createElement("canvas");
    probe.width = dw;
    probe.height = dh;
    const pctx = probe.getContext("2d", { willReadFrequently: true });
    if (!pctx) return blob;
    pctx.drawImage(img, 0, 0, dw, dh);
    const { data } = pctx.getImageData(0, 0, dw, dh);

    const lumaAt = (x: number, y: number) => {
      const i = (y * dw + x) * 4;
      return luma(data[i], data[i + 1], data[i + 2]);
    };

    // A non-white corner means a background we can't safely trim to — leave it.
    const corners = [
      lumaAt(0, 0),
      lumaAt(dw - 1, 0),
      lumaAt(0, dh - 1),
      lumaAt(dw - 1, dh - 1),
    ];
    if (corners.some((l) => l < PAPER_LUMA)) return blob;

    // A row or column is content only with enough ink to outweigh a stray
    // speck — the failure mode that let a dust fleck anchor the earlier crop.
    const minRowInk = Math.max(2, Math.round(dw * 0.01));
    const minColInk = Math.max(2, Math.round(dh * 0.01));

    let top = -1;
    let bottom = -1;
    for (let y = 0; y < dh; y++) {
      let ink = 0;
      for (let x = 0; x < dw; x++) if (lumaAt(x, y) < INK_LUMA) ink++;
      if (ink >= minRowInk) {
        if (top === -1) top = y;
        bottom = y;
      }
    }

    let left = -1;
    let right = -1;
    for (let x = 0; x < dw; x++) {
      let ink = 0;
      for (let y = 0; y < dh; y++) if (lumaAt(x, y) < INK_LUMA) ink++;
      if (ink >= minColInk) {
        if (left === -1) left = x;
        right = x;
      }
    }

    if (top === -1 || left === -1) return blob; // blank

    // A little breathing room so text isn't flush to the edge.
    const padX = Math.round(dw * 0.02);
    const padY = Math.round(dh * 0.02);
    left = Math.max(0, left - padX);
    right = Math.min(dw - 1, right + padX);
    top = Math.max(0, top - padY);
    bottom = Math.min(dh - 1, bottom + padY);

    const boxW = right - left + 1;
    const boxH = bottom - top + 1;
    // Almost nothing to gain — skip the re-encode and its generation of loss.
    if (boxW >= dw * 0.95 && boxH >= dh * 0.95) return blob;

    // Map the detected box back to full resolution and cut it there.
    const sx = Math.round(left / scale);
    const sy = Math.round(top / scale);
    const sw = Math.min(w - sx, Math.round(boxW / scale));
    const sh = Math.min(h - sy, Math.round(boxH / scale));

    const out = document.createElement("canvas");
    out.width = sw;
    out.height = sh;
    const octx = out.getContext("2d");
    if (!octx) return blob;
    octx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    const trimmed = await new Promise<Blob | null>((resolve) =>
      out.toBlob((b) => resolve(b), "image/jpeg", 0.9),
    );
    return trimmed ?? blob;
  } catch {
    return blob;
  }
}
