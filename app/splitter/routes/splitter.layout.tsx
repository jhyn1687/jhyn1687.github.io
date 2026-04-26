import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router";
import { BillSidebar } from "~/splitter/components/BillSidebar";
import { useBillsStore } from "~/splitter/hooks/useBillsStore";

function Toast({
  text,
  type,
  onDismiss,
}: {
  text: string;
  type: "success" | "error";
  onDismiss: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 3500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      className={[
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 cursor-pointer rounded-full px-5 py-2.5 text-sm font-medium shadow-lg",
        type === "success"
          ? "bg-ctp-green/10 border border-ctp-green/30 text-ctp-green"
          : "bg-ctp-red/10 border border-ctp-red/30 text-ctp-red",
      ].join(" ")}
    >
      {text}
    </div>
  );
}

export type SplitterLayoutContext = {
  store: ReturnType<typeof useBillsStore>;
  onMobileMenu: () => void;
};

export function clientLoader() {
  return { ok: true };
}

export function HydrateFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-ctp-base font-nunito">
      <span className="text-ctp-subtext1">Loading…</span>
    </div>
  );
}

export default function SplitterLayout() {
  const store = useBillsStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-ctp-base font-nunito">
      {store.toast && (
        <Toast
          text={store.toast.text}
          type={store.toast.type}
          onDismiss={store.clearToast}
        />
      )}
      <BillSidebar
        localBills={store.localBills}
        sharedBills={store.sharedBills}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onDeleteLocal={store.deleteLocalBill}
        onDeleteShared={store.removeSharedBill}
      />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Outlet
          context={
            {
              store,
              onMobileMenu: () => setMobileOpen((o) => !o),
            } satisfies SplitterLayoutContext
          }
        />
      </div>
    </div>
  );
}
