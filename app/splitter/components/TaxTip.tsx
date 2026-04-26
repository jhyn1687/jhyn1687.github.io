const TIP_PRESETS = [15, 18, 20, 25];

interface TaxTipProps {
  tax: number;
  tip: number;
  subtotal: number;
  onTaxChange: (v: number) => void;
  onTipChange: (v: number) => void;
  readOnly?: boolean;
}

export function TaxTip({
  tax,
  tip,
  subtotal,
  onTaxChange,
  onTipChange,
  readOnly = false,
}: TaxTipProps) {
  function applyTipPreset(pct: number) {
    onTipChange(Math.round(subtotal * pct) / 100);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-ctp-text">Tax &amp; Tip</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ctp-subtext0">Tax</label>
          <div className="flex items-center rounded-lg border border-ctp-surface1/50 bg-ctp-surface0 px-3 focus-within:border-ctp-teal focus-within:ring-1 focus-within:ring-ctp-teal/30">
            <span className="text-xs font-semibold text-ctp-overlay0">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={tax === 0 ? "" : tax}
              onChange={(e) => onTaxChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              readOnly={readOnly}
              className="flex-1 bg-transparent py-2 pl-1.5 text-sm font-semibold text-ctp-text placeholder-ctp-overlay0 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ctp-subtext0">Tip</label>
          <div className="flex items-center rounded-lg border border-ctp-surface1/50 bg-ctp-surface0 px-3 focus-within:border-ctp-teal focus-within:ring-1 focus-within:ring-ctp-teal/30">
            <span className="text-xs font-semibold text-ctp-overlay0">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={tip === 0 ? "" : tip}
              onChange={(e) => onTipChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              readOnly={readOnly}
              className="flex-1 bg-transparent py-2 pl-1.5 text-sm font-semibold text-ctp-text placeholder-ctp-overlay0 focus:outline-none"
            />
          </div>
          {!readOnly && subtotal > 0 && (
            <div className="flex gap-1.5">
              {TIP_PRESETS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyTipPreset(pct)}
                  className="flex-1 rounded-full border border-ctp-surface1/50 bg-ctp-surface0 py-1 text-[11px] font-semibold text-ctp-subtext0 transition-colors hover:border-ctp-teal/50 hover:text-ctp-teal"
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
