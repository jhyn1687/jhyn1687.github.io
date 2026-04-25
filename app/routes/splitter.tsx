import { useEffect, useRef } from "react";
import { MdForkRight } from "react-icons/md";
import type { Route } from "./+types/splitter";
import { BillBreakdown } from "~/components/splitter/BillBreakdown";
import { CTABar } from "~/components/splitter/CTABar";
import { ItemSection } from "~/components/splitter/ItemSection";
import { ParticipantSection } from "~/components/splitter/ParticipantSection";
import type { Bill } from "~/components/splitter/types";
import { useBillState } from "~/components/splitter/useBillState";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Splitter — Tony Yuan" },
    { name: "description", content: "Split bills with friends, no login required." },
  ];
}

export async function clientLoader({
  request,
}: Route.ClientLoaderArgs): Promise<{
  initialBill: Bill | null;
  isSharedView: boolean;
}> {
  const url = new URL(request.url);
  const shareCode = url.searchParams.get("share");

  if (shareCode) {
    try {
      const res = await fetch(`/api/bill/${shareCode}`);
      if (res.ok) {
        const { bill } = (await res.json()) as { bill: Bill };
        return { initialBill: bill, isSharedView: true };
      }
    } catch {
      // fall through
    }
  }

  try {
    const draft = localStorage.getItem("splitter_bill_draft");
    if (draft) {
      return { initialBill: JSON.parse(draft) as Bill, isSharedView: false };
    }
  } catch {
    // fall through
  }

  return { initialBill: null, isSharedView: false };
}

export function HydrateFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ctp-base">
      <span className="text-ctp-subtext1">Loading…</span>
    </div>
  );
}

function SharedBanner({ bill }: { bill: Bill }) {
  const handleFork = () => {
    const forked: Bill = {
      title: bill.title,
      participants: bill.participants.map((p) => ({
        ...p,
        id: crypto.randomUUID(),
      })),
      items: bill.items.map((i) => ({
        ...i,
        id: crypto.randomUUID(),
        splitBetween: [...i.splitBetween],
      })),
    };
    localStorage.setItem("splitter_bill_draft", JSON.stringify(forked));
    window.location.href = "/splitter";
  };

  return (
    <div className="flex flex-row items-center justify-between rounded-xl border border-ctp-teal/30 bg-ctp-teal/10 px-4 py-3">
      <span className="text-sm text-ctp-teal">
        Viewing a shared bill — read only
      </span>
      <button
        type="button"
        onClick={handleFork}
        className="flex items-center gap-1.5 rounded-lg border border-ctp-teal/40 bg-ctp-teal/20 px-3 py-1.5 text-sm font-medium text-ctp-teal transition-colors hover:bg-ctp-teal/30"
      >
        <MdForkRight size={18} />
        Fork &amp; Edit
      </button>
    </div>
  );
}

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
        "fixed bottom-6 right-6 z-50 cursor-pointer rounded-xl border px-4 py-3 text-sm shadow-lg",
        type === "success"
          ? "border-ctp-green/30 bg-ctp-green/10 text-ctp-green"
          : "border-ctp-red/30 bg-ctp-red/10 text-ctp-red",
      ].join(" ")}
    >
      {text}
    </div>
  );
}

export default function SplitterPage({ loaderData }: Route.ComponentProps) {
  const { initialBill, isSharedView } = loaderData;

  const {
    title,
    setTitle,
    participants,
    items,
    sharing,
    toast,
    clearToast,
    addParticipant,
    updateParticipant,
    removeParticipant,
    addItem,
    updateItem,
    removeItem,
    importItems,
    handleShare,
    handleReset,
  } = useBillState(initialBill);

  return (
    <div className="min-h-screen bg-ctp-base font-mono">
      {toast && (
        <Toast text={toast.text} type={toast.type} onDismiss={clearToast} />
      )}
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
        {isSharedView && initialBill && <SharedBanner bill={initialBill} />}
        <CTABar
          title={title}
          setTitle={setTitle}
          onShare={handleShare}
          onReset={handleReset}
          sharing={sharing}
          readOnly={isSharedView}
        />
        <ParticipantSection
          participants={participants}
          onAdd={addParticipant}
          onUpdate={updateParticipant}
          onRemove={removeParticipant}
          readOnly={isSharedView}
        />
        <ItemSection
          items={items}
          participants={participants}
          onAdd={addItem}
          onItemChange={(id, patch) => updateItem(id, patch)}
          onItemRemove={removeItem}
          onItemsImported={importItems}
          readOnly={isSharedView}
        />
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-ctp-text">Breakdown</h2>
          <BillBreakdown items={items} participants={participants} />
        </section>
      </main>
    </div>
  );
}
