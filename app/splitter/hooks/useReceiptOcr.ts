import { useState } from "react";
import {
  parseReceiptText,
  type OcrItem,
} from "~/splitter/utils/parseReceiptText";
import {
  PdfTooLongError,
  UnreadableImageError,
  prepareReceipt,
} from "~/splitter/utils/prepareReceipt";

function prepareErrorMessage(err: unknown) {
  if (err instanceof PdfTooLongError) {
    return `That PDF has ${err.pageCount} pages — please upload a receipt of 3 pages or fewer.`;
  }
  if (err instanceof UnreadableImageError) {
    return "This browser can't open that image. Try a JPG, PNG, or PDF.";
  }
  return "Could not read that file. Try a JPG, PNG, or PDF.";
}

/**
 * Several tax lines can mean split tax (state + city) on one receipt or two
 * receipts in one image. Both are summed correctly, but the second would also
 * merge two bills' items, so flag it without guessing which happened.
 */
function reviewNote(taxLineCount: number) {
  return taxLineCount > 1
    ? " Found more than one tax line — please double-check the tax and tip."
    : "";
}

/**
 * The normalized JPEG rides along with the parsed items so the caller can store
 * it against the bill — only the caller knows the bill id, which for a brand
 * new bill doesn't exist until the import itself creates it.
 */
export type ScanResult = {
  items: OcrItem[];
  tax?: number;
  tip?: number;
  image: Blob;
};

export function useReceiptOcr(
  onImport: (result: ScanResult) => void,
  onSuccess?: () => void,
  /**
   * True when the bill already holds a scan. A bill maps to exactly one
   * receipt, so a second scan replaces the first — worth confirming before
   * we spend an OCR call on something the user may not want.
   */
  replacesExistingScan = false,
) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function handleFile(file: File) {
    // Hold the file and ask first — the model is only called once confirmed.
    if (replacesExistingScan) {
      setPendingFile(file);
      return;
    }
    return scan(file);
  }

  function cancelReplace() {
    setPendingFile(null);
    setStatus(null);
  }

  function confirmReplace() {
    const file = pendingFile;
    setPendingFile(null);
    if (file) return scan(file);
  }

  async function scan(file: File) {
    setLoading(true);
    setStatus(null);

    // Normalize to JPEG up front so the model and the Tesseract fallback both
    // get a format they can actually read, whatever the user picked.
    let upload: Blob;
    try {
      setStatus(
        file.type === "application/pdf" ? "Reading PDF…" : "Preparing image…",
      );
      upload = (await prepareReceipt(file)).blob;
    } catch (err) {
      setStatus(prepareErrorMessage(err));
      setLoading(false);
      return;
    }

    try {
      const form = new FormData();
      form.append("document", upload, "receipt.jpg");
      const res = await fetch("/api/parse-receipt", {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        const data = (await res.json()) as {
          items: OcrItem[];
          tax?: number | null;
          tip?: number | null;
          taxLineCount?: number;
        };
        if (data.items.length > 0) {
          onImport({
            items: data.items,
            tax: data.tax ?? undefined,
            tip: data.tip ?? undefined,
            image: upload,
          });
          setStatus(
            `Imported ${data.items.length} item(s). Please review.` +
              reviewNote(data.taxLineCount ?? 0),
          );
          setLoading(false);
          onSuccess?.();
          return;
        }
      }
      if (res.status === 429) {
        setStatus("Server quota reached — running local OCR…");
      } else if (res.status === 451) {
        setStatus("Running local OCR…");
      }
    } catch {
      // fall through to Tesseract
    }

    try {
      setStatus("Running local OCR (may take a moment)…");
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const {
        data: { text },
      } = await worker.recognize(upload);
      await worker.terminate();
      const { items: parsed, tax, tip, taxLineCount } = parseReceiptText(text);
      if (parsed.length > 0) {
        onImport({ items: parsed, tax, tip, image: upload });
        setStatus(
          `Imported ${parsed.length} item(s) via OCR — results are best-effort, please review.` +
            reviewNote(taxLineCount),
        );
        onSuccess?.();
      } else {
        setStatus("Could not extract items. Try a clearer image.");
      }
    } catch {
      setStatus("OCR failed. Please enter items manually.");
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    status,
    handleFile,
    replacePending: pendingFile !== null,
    confirmReplace,
    cancelReplace,
  };
}
