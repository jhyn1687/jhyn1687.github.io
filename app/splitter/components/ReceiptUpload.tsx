import { useRef, useState } from "react";
import { MdScanner, MdChevronRight } from "react-icons/md";
import {
  parseReceiptText,
  type OcrItem,
} from "~/splitter/utils/parseReceiptText";

interface ReceiptUploadProps {
  onImport: (items: OcrItem[], tax?: number, tip?: number) => void;
  hasContent: boolean;
}

export function ReceiptUpload({ onImport, hasContent }: ReceiptUploadProps) {
  const [expanded, setExpanded] = useState(!hasContent);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-collapse once content is added
  if (hasContent && expanded && !loading) {
    // Use a ref-free check — will collapse on next render after content added
  }

  async function handleFile(file: File) {
    setLoading(true);
    setStatus(null);

    // Try GCV first
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
          setExpanded(false);
          return;
        }
      }
      if (res.status === 429) {
        setStatus("Server quota reached — running local OCR…");
      } else if (res.status === 451) {
        setStatus("Running local OCR…");
      }
    } catch {
      // fall through
    }

    // Tesseract.js fallback
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
        setExpanded(false);
      } else {
        setStatus("Could not extract items. Try a clearer image.");
      }
    } catch {
      setStatus("OCR failed. Please enter items manually.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ctp-surface1/50 bg-ctp-surface0/40">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => !loading && setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-ctp-surface0/60"
        disabled={loading}
      >
        <span className="flex-1 text-[15px] font-bold text-ctp-text">
          Scan Receipt
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
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-ctp-surface1 border-t-ctp-teal" />
              <p className="text-center text-sm text-ctp-subtext1">
                {status ?? "Reading receipt…"}
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ctp-surface1 bg-ctp-mantle/50 py-6 text-center transition-colors hover:border-ctp-teal/50 hover:bg-ctp-teal/5"
              >
                <MdScanner size={32} />
                <span className="text-sm font-semibold text-ctp-subtext0">
                  Drop your receipt here
                </span>
                <span className="text-xs text-ctp-overlay0">
                  or click to browse · JPG, PNG, HEIC
                </span>
              </button>
              {status && (
                <p className="mt-3 text-center text-xs text-ctp-subtext1">
                  {status}
                </p>
              )}
            </>
          )}
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
        </div>
      )}
    </div>
  );
}
