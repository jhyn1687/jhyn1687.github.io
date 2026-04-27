import { useRef } from "react";
import { MdClose, MdScanner } from "react-icons/md";
import { useReceiptOcr } from "~/splitter/hooks/useReceiptOcr";
import type { OcrItem } from "~/splitter/utils/parseReceiptText";

interface ScanReceiptModalProps {
  onImport: (items: OcrItem[], tax?: number, tip?: number) => void;
  onClose: () => void;
}

export function ScanReceiptModal({ onImport, onClose }: ScanReceiptModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { loading, status, handleFile } = useReceiptOcr(onImport, onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-ctp-surface1/50 bg-ctp-mantle shadow-2xl">
        <div className="flex items-center justify-between border-b border-ctp-surface1/50 px-5 py-4">
          <span className="text-[15px] font-bold text-ctp-text">
            Scan Receipt
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-ctp-overlay0 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text disabled:opacity-40"
          >
            <MdClose size={18} />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
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
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ctp-surface1 bg-ctp-base/50 py-8 text-center transition-colors hover:border-ctp-teal/50 hover:bg-ctp-teal/5"
              >
                <MdScanner size={36} className="text-ctp-overlay0" />
                <span className="text-sm font-semibold text-ctp-subtext0">
                  Tap to upload your receipt
                </span>
                <span className="text-xs text-ctp-overlay0">
                  JPG, PNG, HEIC
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
      </div>
    </div>
  );
}
