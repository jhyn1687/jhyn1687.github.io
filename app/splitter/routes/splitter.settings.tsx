import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import type { Route } from "./+types/splitter.settings";
import type { SplitterLayoutContext } from "~/splitter/routes/splitter.layout";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Settings — Splitter" }];
}

export function clientLoader() {
  return { ok: true };
}

export function HydrateFallback() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <span className="text-ctp-subtext1">Loading…</span>
    </div>
  );
}

export default function SplitterSettingsPage() {
  const navigate = useNavigate();
  const { store, onMobileMenu } = useOutletContext<SplitterLayoutContext>();
  const [clearConfirm, setClearConfirm] = useState(false);

  function handleClear() {
    if (!clearConfirm) {
      setClearConfirm(true);
      setTimeout(() => setClearConfirm(false), 4000);
      return;
    }
    store.clearAllData();
    navigate("/splitter/new");
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-15 items-center gap-3 border-b border-ctp-surface1/50 bg-ctp-base/85 px-6 backdrop-blur-md">
        <button
          type="button"
          onClick={onMobileMenu}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ctp-subtext0 hover:bg-ctp-surface1/50 md:hidden"
          aria-label="Open menu"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path
              fillRule="evenodd"
              d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <span className="text-lg font-bold text-ctp-text">Settings</span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-xl px-5 py-8 lg:px-8">
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-ctp-surface1/50 bg-ctp-surface0/40 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-ctp-text">
                    Skip share confirmation
                  </div>
                  <div className="mt-0.5 text-sm text-ctp-subtext0">
                    Share links without showing the warning dialog each time.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    store.updateSettings({
                      skipShareDialog: !store.settings.skipShareDialog,
                    })
                  }
                  className={[
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    store.settings.skipShareDialog
                      ? "bg-ctp-teal"
                      : "bg-ctp-surface2",
                  ].join(" ")}
                  role="switch"
                  aria-checked={store.settings.skipShareDialog}
                >
                  <span
                    className={[
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      store.settings.skipShareDialog
                        ? "translate-x-5"
                        : "translate-x-0.5",
                    ].join(" ")}
                  />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-ctp-surface1/50 bg-ctp-surface0/40 p-5">
              <div className="mb-3 font-semibold text-ctp-text">
                Clear local data
              </div>
              <p className="mb-4 text-sm text-ctp-subtext0">
                Permanently removes all bills saved on this device. This cannot
                be undone.
              </p>
              <button
                type="button"
                onClick={handleClear}
                className={[
                  "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                  clearConfirm
                    ? "bg-ctp-red text-white hover:opacity-90"
                    : "border border-ctp-red/50 bg-ctp-red/10 text-ctp-red hover:bg-ctp-red/20",
                ].join(" ")}
              >
                {clearConfirm ? "Click again to confirm" : "Clear all data"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
