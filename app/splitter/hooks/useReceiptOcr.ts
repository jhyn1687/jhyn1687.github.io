import { useState } from "react";
import {
  parseReceiptText,
  type OcrItem,
} from "~/splitter/utils/parseReceiptText";

export function useReceiptOcr(
  onImport: (items: OcrItem[], tax?: number, tip?: number) => void,
  onSuccess?: () => void,
) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setStatus(null);

    try {
      const form = new FormData();
      form.append("document", file);
      const res = await fetch("/api/parse-receipt", {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        const data = (await res.json()) as {
          items: OcrItem[];
          tax?: number | null;
          tip?: number | null;
        };
        if (data.items.length > 0) {
          onImport(data.items, data.tax ?? undefined, data.tip ?? undefined);
          setStatus(`Imported ${data.items.length} item(s). Please review.`);
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
      } = await worker.recognize(file);
      await worker.terminate();
      const { items: parsed, tax, tip } = parseReceiptText(text);
      if (parsed.length > 0) {
        onImport(parsed, tax, tip);
        setStatus(
          `Imported ${parsed.length} item(s) via OCR — results are best-effort, please review.`,
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

  return { loading, status, handleFile };
}
