import { useRef, useState } from "react";
import { MdCameraAlt } from "react-icons/md";
import type { OcrItem } from "./useBillState";

interface ReceiptUploadProps {
  onItemsImported: (items: OcrItem[]) => void;
}

function parseReceiptText(text: string): OcrItem[] {
  const lines = text.split("\n");
  const items: OcrItem[] = [];
  // Match lines like: "Item description    12.34" or "Item description $12.34"
  const pricePattern = /^(.+?)\s+\$?([\d]+\.[\d]{2})\s*$/;
  // Skip lines that look like totals/taxes/tips
  const skipWords = /total|tax|tip|subtotal|gratuity|discount|change|balance|amount|due/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || skipWords.test(trimmed)) continue;
    const match = trimmed.match(pricePattern);
    if (match) {
      const description = match[1].trim();
      const total_amount = parseFloat(match[2]);
      if (description.length > 1 && total_amount > 0 && total_amount < 10000) {
        items.push({ description, total_amount });
      }
    }
  }
  return items;
}

export function ReceiptUpload({ onItemsImported }: ReceiptUploadProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setStatus(null);

    // Try Mindee first
    try {
      const form = new FormData();
      form.append("document", file);
      const res = await fetch("/api/parse-receipt", {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        const data = (await res.json()) as { items: OcrItem[] };
        if (data.items.length > 0) {
          onItemsImported(data.items);
          setStatus(`Imported ${data.items.length} item(s) via Mindee. Please review.`);
          setLoading(false);
          return;
        }
      }
    } catch {
      // fall through to Tesseract
    }

    // Tesseract.js fallback (lazy loaded)
    try {
      setStatus("Mindee unavailable — running local OCR (this may take a moment)…");
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      const parsed = parseReceiptText(text);
      if (parsed.length > 0) {
        onItemsImported(parsed);
        setStatus(`Imported ${parsed.length} item(s) via OCR. Results are best-effort — please review.`);
      } else {
        setStatus("Could not extract items from this receipt. Try a clearer image.");
      }
    } catch {
      setStatus("OCR failed. Please enter items manually.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-lg border border-ctp-surface1/50 bg-ctp-surface0 px-3 py-2 text-sm text-ctp-subtext1 transition-colors hover:border-ctp-teal/50 hover:bg-ctp-surface1 hover:text-ctp-teal disabled:opacity-50"
        title="Upload receipt image"
      >
        <MdCameraAlt size={18} />
        <span>{loading ? "Scanning…" : "Upload Receipt"}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {status && (
        <p className="text-xs text-ctp-subtext1">{status}</p>
      )}
    </div>
  );
}
