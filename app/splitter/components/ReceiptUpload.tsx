import { useRef, useState } from "react";
import { MdScanner, MdChevronRight } from "react-icons/md";
import { useReceiptOcr } from "~/splitter/hooks/useReceiptOcr";
import type { OcrItem } from "~/splitter/utils/parseReceiptText";

interface ReceiptUploadProps {
  onImport: (items: OcrItem[], tax?: number, tip?: number) => void;
  hasContent: boolean;
}

export function ReceiptUpload({ onImport, hasContent }: ReceiptUploadProps) {
  const [expanded, setExpanded] = useState(!hasContent);
  const inputRef = useRef<HTMLInputElement>(null);
  const { loading, status, handleFile } = useReceiptOcr(onImport, () =>
    setExpanded(false),
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-ctp-surface1/50 bg-ctp-surface0/40">
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
