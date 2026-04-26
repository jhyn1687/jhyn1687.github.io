import { useCallback, useEffect, useRef, useState } from "react";
import { MdForkRight } from "react-icons/md";
import { useNavigate } from "react-router";
import { colorForIndex } from "./colors";
import { AppHeader } from "./AppHeader";
import { BillSidebar } from "./BillSidebar";
import { BillSummary } from "./BillSummary";
import { ItemSection } from "./ItemSection";
import { ParticipantSection } from "./ParticipantSection";
import { ReceiptUpload } from "./ReceiptUpload";
import { ShareDialog } from "./ShareDialog";
import { TaxTip } from "./TaxTip";
import { useBillsStore } from "./useBillsStore";
import type { Bill, Item, Participant, SavedBill } from "./types";
import type { OcrItem } from "./parseReceiptText";

export type Toast = { text: string; type: "success" | "error" };

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

function SharedBanner({
  bill,
  onFork,
}: {
  bill: Bill;
  onFork: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-ctp-teal/30 bg-ctp-teal/10 px-4 py-3">
      <span className="text-sm text-ctp-teal">Viewing a shared bill — read only</span>
      <button
        type="button"
        onClick={onFork}
        className="flex items-center gap-1.5 rounded-lg border border-ctp-teal/40 bg-ctp-teal/20 px-3 py-1.5 text-sm font-medium text-ctp-teal transition-colors hover:bg-ctp-teal/30"
      >
        <MdForkRight size={18} />
        Fork &amp; Edit
      </button>
    </div>
  );
}

interface SplitterShellProps {
  initialSavedBill: SavedBill | null;
  isSharedView?: boolean;
  isNew?: boolean;
  error?: string;
}

export function SplitterShell({
  initialSavedBill,
  isSharedView = false,
  isNew = false,
  error,
}: SplitterShellProps) {
  const navigate = useNavigate();
  const store = useBillsStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileScanOpen, setMobileScanOpen] = useState(false);

  const emptyBill: Bill = { title: "", participants: [], items: [], tax: 0, tip: 0 };
  const [bill, setBill] = useState<Bill>(initialSavedBill?.bill ?? emptyBill);
  const [savedBillId, setSavedBillId] = useState<string | null>(
    initialSavedBill?.id ?? null,
  );
  const isFirstMutation = useRef(!savedBillId && isNew);

  const { title, participants, items, tax, tip } = bill;

  function mutate(patch: Partial<Bill>) {
    const updated = { ...bill, ...patch };
    setBill(updated);

    if (isFirstMutation.current) {
      // First edit on /splitter/new: generate UUID + navigate
      isFirstMutation.current = false;
      const id = crypto.randomUUID();
      setSavedBillId(id);
      const saved: SavedBill = {
        id,
        bill: updated,
        updatedAt: Date.now(),
        isShared: false,
      };
      store.saveBill(saved);
      navigate(`/splitter/${id}`, { replace: true });
    } else if (savedBillId) {
      const existing = store.bills.find((b) => b.id === savedBillId);
      const saved: SavedBill = {
        ...(existing ?? {
          id: savedBillId,
          isShared: false,
          shareCode: undefined,
          shareUrl: undefined,
        }),
        bill: updated,
        updatedAt: Date.now(),
      };
      store.saveBill(saved);
    }
  }

  const setTitle = useCallback(
    (t: string) => mutate({ title: t }),
    [bill],
  );

  const addParticipant = useCallback(
    (name: string) => {
      const color = colorForIndex(participants.length);
      mutate({
        participants: [
          ...participants,
          { id: crypto.randomUUID(), name, color },
        ],
      });
    },
    [bill],
  );

  const removeParticipant = useCallback(
    (id: string) => {
      mutate({
        participants: participants.filter((p) => p.id !== id),
        items: items.map((item) => ({
          ...item,
          splitBetween: item.splitBetween.filter((pid) => pid !== id),
        })),
      });
    },
    [bill],
  );

  const addItem = useCallback(
    (name: string, price: number) => {
      mutate({
        items: [
          ...items,
          { id: crypto.randomUUID(), name, price, splitBetween: [] },
        ],
      });
    },
    [bill],
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<Item>) => {
      mutate({
        items: items.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      });
    },
    [bill],
  );

  const removeItem = useCallback(
    (id: string) => {
      mutate({ items: items.filter((item) => item.id !== id) });
    },
    [bill],
  );

  const importItems = useCallback(
    (ocrItems: OcrItem[]) => {
      const newItems: Item[] = ocrItems
        .filter((oi) => oi.description && oi.total_amount > 0)
        .map((oi) => ({
          id: crypto.randomUUID(),
          name: oi.description,
          price: oi.total_amount,
          splitBetween: [],
        }));
      mutate({ items: [...items, ...newItems] });
    },
    [bill],
  );

  const handleFork = useCallback(() => {
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
      tax: bill.tax,
      tip: bill.tip,
    };
    const id = crypto.randomUUID();
    store.saveBill({ id, bill: forked, updatedAt: Date.now(), isShared: false });
    navigate(`/splitter/${id}`);
  }, [bill, store, navigate]);

  const activeSavedBill = savedBillId
    ? store.bills.find((b) => b.id === savedBillId) ?? null
    : null;

  // Compute what's blocking the Share button (null = nothing, share is allowed)
  function getShareBlocker(): string | undefined {
    if (isSharedView) return undefined;
    if (!title.trim()) return "Add a bill title first";
    if (participants.length === 0) return "Add at least one person";
    if (items.length === 0) return "Add at least one item";
    const unassigned = items.filter((i) => i.splitBetween.length === 0).length;
    if (unassigned > 0)
      return `Assign all items — ${unassigned} item${unassigned > 1 ? "s" : ""} unassigned`;
    return undefined;
  }
  const shareBlocker = getShareBlocker();

  function handleShare() {
    if (shareBlocker) return;
    if (!activeSavedBill) return;
    const result = store.initiateShare(activeSavedBill);
    if (result === "confirm") {
      store.confirmShare(activeSavedBill);
    }
  }

  const subtotal = items.reduce(
    (sum, item) => sum + (isNaN(item.price) ? 0 : item.price),
    0,
  );

  const hasContent = participants.length > 0 || items.length > 0;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ctp-base font-mono">
        <div className="text-center">
          <p className="text-ctp-red">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/splitter/new")}
            className="mt-4 rounded-lg bg-ctp-surface0 px-4 py-2 text-sm text-ctp-subtext1 hover:text-ctp-text"
          >
            Start a new bill
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ctp-base font-mono">
      {store.toast && (
        <Toast
          text={store.toast.text}
          type={store.toast.type}
          onDismiss={store.clearToast}
        />
      )}

      <ShareDialog
        open={store.shareDialogOpen}
        sharing={store.sharing}
        skipShareDialog={store.settings.skipShareDialog}
        onUpdateSkip={(skip) => store.updateSettings({ skipShareDialog: skip })}
        onConfirm={() => activeSavedBill && store.confirmShare(activeSavedBill)}
        onCancel={() => store.setShareDialogOpen(false)}
      />

      {/* Mobile scan bottom sheet */}
      {mobileScanOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          onClick={() => setMobileScanOpen(false)}
        >
          <div
            className="rounded-t-2xl bg-ctp-surface0 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-ctp-surface2" />
            <ReceiptUpload
              onItemsImported={(oi) => {
                importItems(oi);
                setMobileScanOpen(false);
              }}
              hasContent={hasContent}
            />
          </div>
        </div>
      )}

      {/* Sidebar */}
      <BillSidebar
        myBills={store.myBills}
        sharedBills={store.sharedBills}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <AppHeader
          title={title}
          setTitle={setTitle}
          onShare={handleShare}
          onMobileMenu={() => setMobileOpen((o) => !o)}
          onMobileScan={() => setMobileScanOpen((o) => !o)}
          sharing={store.sharing}
          shareBlocker={shareBlocker}
          readOnly={isSharedView}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-7 px-5 py-8 md:grid-cols-[1fr_360px] lg:px-8">
            {/* Left col */}
            <div className="flex flex-col gap-8">
              {isSharedView && (
                <SharedBanner bill={bill} onFork={handleFork} />
              )}
              <ParticipantSection
                participants={participants}
                onAdd={addParticipant}
                onRemove={removeParticipant}
                readOnly={isSharedView}
              />
              <ItemSection
                items={items}
                participants={participants}
                onAdd={addItem}
                onItemChange={updateItem}
                onItemRemove={removeItem}
                readOnly={isSharedView}
              />
              {!isSharedView && (
                <TaxTip
                  tax={tax}
                  tip={tip}
                  subtotal={subtotal}
                  onTaxChange={(v) => mutate({ tax: v })}
                  onTipChange={(v) => mutate({ tip: v })}
                />
              )}
            </div>

            {/* Right col */}
            <div className="flex flex-col gap-5 md:sticky md:top-4 md:self-start">
              {!isSharedView && (
                <div className="hidden md:block">
                  <ReceiptUpload
                    onItemsImported={importItems}
                    hasContent={hasContent}
                  />
                </div>
              )}
              <BillSummary
                items={items}
                participants={participants}
                tax={tax}
                tip={tip}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
