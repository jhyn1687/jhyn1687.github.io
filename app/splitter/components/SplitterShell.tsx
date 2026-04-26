import { useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { canShareBill } from "~/splitter/utils/bill";
import { colorForIndex, nextColorSeed } from "~/splitter/utils/colors";
import { AppHeader } from "~/splitter/components/AppHeader";
import { BillSummary } from "~/splitter/components/BillSummary";
import { ItemSection } from "~/splitter/components/ItemSection";
import { ParticipantSection } from "~/splitter/components/ParticipantSection";
import { ShareDialog } from "~/splitter/components/ShareDialog";
import { TaxTip } from "~/splitter/components/TaxTip";
import type { SplitterLayoutContext } from "~/splitter/routes/splitter.layout";
import type { Bill, Item, LocalBill, SharedBill } from "~/splitter/types";

interface SplitterShellProps {
  initialLocalBill: LocalBill | null;
  isNew?: boolean;
  sharedBill?: SharedBill | null;
  error?: string;
}

export function SplitterShell({
  initialLocalBill,
  isNew = false,
  sharedBill,
  error,
}: SplitterShellProps) {
  const navigate = useNavigate();
  const { store, onMobileMenu } = useOutletContext<SplitterLayoutContext>();
  const [shareAttempted, setShareAttempted] = useState(false);

  const isSharedView = !!sharedBill;
  const emptyBill: Bill = {
    title: "",
    participants: [],
    items: [],
    tax: 0,
    tip: 0,
  };
  const [bill, setBill] = useState<Bill>(
    sharedBill?.bill ?? initialLocalBill?.bill ?? emptyBill,
  );
  const [savedBillId, setSavedBillId] = useState<string | null>(
    initialLocalBill?.id ?? null,
  );
  const isFirstMutation = useRef(!savedBillId && isNew);
  // Only ever increments — never decremented on removal — so re-adds after
  // removals always get a fresh color rather than colliding with an existing one.
  const colorSeed = useRef(
    nextColorSeed(initialLocalBill?.bill.participants ?? []),
  );

  const { title, participants, items, tax, tip } = bill;

  function mutate(patch: Partial<Bill>) {
    const updated = { ...bill, ...patch };
    setBill(updated);

    if (isFirstMutation.current) {
      isFirstMutation.current = false;
      const id = crypto.randomUUID();
      setSavedBillId(id);
      const saved: LocalBill = { id, bill: updated, updatedAt: Date.now() };
      store.saveLocalBill(saved);
      navigate(`/splitter/${id}`, { replace: true });
    } else if (savedBillId) {
      const existing = store.localBills.find((b) => b.id === savedBillId);
      const saved: LocalBill = {
        ...(existing ?? { id: savedBillId }),
        bill: updated,
        updatedAt: Date.now(),
      };
      store.saveLocalBill(saved);
    }
  }

  function setTitle(t: string) {
    mutate({ title: t });
  }

  function addParticipant(name: string) {
    const color = colorForIndex(colorSeed.current++);
    const newParticipant = { id: crypto.randomUUID(), name, color };
    mutate({
      participants: [...participants, newParticipant],
      items: items.map((item) =>
        item.splitEvenly
          ? { ...item, splitBetween: [...item.splitBetween, newParticipant.id] }
          : item,
      ),
    });
  }

  function removeParticipant(id: string) {
    mutate({
      participants: participants.filter((p) => p.id !== id),
      items: items.map((item) => ({
        ...item,
        splitBetween: item.splitBetween.filter((pid) => pid !== id),
      })),
    });
  }

  function addItem(name: string, price: number) {
    mutate({
      items: [
        ...items,
        { id: crypto.randomUUID(), name, price, splitBetween: [] },
      ],
    });
  }

  function updateItem(id: string, patch: Partial<Item>) {
    mutate({
      items: items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...patch };
        if (updated.splitEvenly)
          updated.splitBetween = participants.map((p) => p.id);
        return updated;
      }),
    });
  }

  function removeItem(id: string) {
    mutate({ items: items.filter((item) => item.id !== id) });
  }

  function handleFork() {
    const sourceBill = sharedBill?.bill ?? bill;
    const idMap = new Map(
      sourceBill.participants.map((p) => [p.id, crypto.randomUUID()]),
    );
    const forked: Bill = {
      title: sourceBill.title,
      participants: sourceBill.participants.map((p) => ({
        ...p,
        id: idMap.get(p.id)!,
      })),
      items: sourceBill.items.map((i) => ({
        ...i,
        id: crypto.randomUUID(),
        splitBetween: i.splitBetween
          .map((pid) => idMap.get(pid)!)
          .filter(Boolean),
      })),
      tax: sourceBill.tax,
      tip: sourceBill.tip,
    };
    const id = crypto.randomUUID();
    store.saveLocalBill({ id, bill: forked, updatedAt: Date.now() });
    navigate(`/splitter/${id}`);
  }

  const activeLocalBill = savedBillId
    ? (store.localBills.find((b) => b.id === savedBillId) ?? null)
    : null;

  const shareBlocked = !isSharedView && !canShareBill(bill);

  function handleShare() {
    if (isSharedView && sharedBill) {
      navigator.clipboard.writeText(sharedBill.shareUrl).then(() => {
        store.showToast("Link copied!", "success");
      });
      return;
    }
    if (shareBlocked) {
      setShareAttempted(true);
      return;
    }
    if (!activeLocalBill) return;
    setShareAttempted(false);
    const onShareSuccess = (code: string) =>
      navigate(`/splitter/share/${code}`);
    const result = store.initiateShare(activeLocalBill);
    if (result === "confirm") {
      store.confirmShare(activeLocalBill, onShareSuccess);
    }
  }

  const subtotal = items.reduce(
    (sum, item) => sum + (isNaN(item.price) ? 0 : item.price),
    0,
  );

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="max-w-sm rounded-2xl border border-ctp-surface1/50 bg-ctp-mantle p-8 text-center shadow-2xl">
          <p className="text-lg font-bold text-ctp-text">Bill not found</p>
          <p className="mt-2 text-sm text-ctp-subtext0">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/splitter/new")}
            className="mt-6 rounded-lg bg-ctp-teal px-4 py-2 text-sm font-semibold text-ctp-base transition-opacity hover:opacity-90"
          >
            Start a new bill
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ShareDialog
        open={store.shareDialogOpen}
        sharing={store.sharing}
        skipShareDialog={store.settings.skipShareDialog}
        onUpdateSkip={(skip) => store.updateSettings({ skipShareDialog: skip })}
        onConfirm={() =>
          activeLocalBill &&
          store.confirmShare(activeLocalBill, (code) =>
            navigate(`/splitter/share/${code}`),
          )
        }
        onCancel={() => store.setShareDialogOpen(false)}
      />

      <AppHeader
        title={title}
        setTitle={setTitle}
        onShare={handleShare}
        onFork={isSharedView ? handleFork : undefined}
        onMobileMenu={onMobileMenu}
        sharing={store.sharing}
        shareBlocked={shareBlocked}
        titleError={shareAttempted && !title.trim()}
        readOnly={isSharedView}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-300 grid-cols-1 gap-7 px-5 py-8 md:grid-cols-[1fr_360px] lg:px-8">
          <div className="flex flex-col gap-8">
            <ParticipantSection
              participants={participants}
              onAdd={addParticipant}
              onRemove={removeParticipant}
              readOnly={isSharedView}
              showError={shareAttempted && participants.length === 0}
            />
            <ItemSection
              items={items}
              participants={participants}
              onAdd={addItem}
              onItemChange={updateItem}
              onItemRemove={removeItem}
              readOnly={isSharedView}
              showError={
                shareAttempted &&
                (items.length === 0 ||
                  items.some((i) => i.splitBetween.length === 0))
              }
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

          <div className="flex flex-col gap-5 md:sticky md:top-4 md:self-start">
            <BillSummary
              items={items}
              participants={participants}
              tax={tax}
              tip={tip}
            />
          </div>
        </div>
      </div>
    </>
  );
}
