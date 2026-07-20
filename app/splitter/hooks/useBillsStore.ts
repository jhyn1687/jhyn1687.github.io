import { useCallback, useRef, useState } from "react";
import type {
  Bill,
  LocalBill,
  SharedBill,
  SplitterSettings,
} from "~/splitter/types";
import { clearReceipts, deleteReceipt } from "~/splitter/utils/receiptStore";

export type Toast = { text: string; type: "success" | "error" };

const LOCAL_KEY = "splitter_local_bills";
const SHARED_KEY = "splitter_shared_bills";
const SETTINGS_KEY = "splitter_settings";
const LEGACY_BILLS_KEY = "splitter_bills";
const LEGACY_DRAFT_KEY = "splitter_bill_draft";

const SHARED_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

function loadLocalBills(): LocalBill[] {
  try {
    // Migrate from splitter_bills (previous format with isShared flag)
    const legacyRaw = localStorage.getItem(LEGACY_BILLS_KEY);
    if (legacyRaw) {
      const old = JSON.parse(legacyRaw) as Array<{
        id: string;
        bill: Bill;
        updatedAt: number;
        shareCode?: string;
        shareUrl?: string;
        isShared: boolean;
      }>;
      const localBills: LocalBill[] = old
        .filter((b) => !b.isShared)
        .map((b) => ({
          id: b.id,
          bill: b.bill,
          updatedAt: b.updatedAt,
          shareCode: b.shareCode,
          shareUrl: b.shareUrl,
        }));
      const sharedBills: SharedBill[] = old
        .filter((b) => b.isShared && b.shareCode && b.shareUrl)
        .map((b) => ({
          shareCode: b.shareCode!,
          shareUrl: b.shareUrl!,
          bill: b.bill,
          cachedAt: b.updatedAt,
          expiresAt: b.updatedAt + SHARED_TTL,
        }));
      localStorage.setItem(LOCAL_KEY, JSON.stringify(localBills));
      if (sharedBills.length > 0 && !localStorage.getItem(SHARED_KEY)) {
        localStorage.setItem(SHARED_KEY, JSON.stringify(sharedBills));
      }
      localStorage.removeItem(LEGACY_BILLS_KEY);
      return localBills;
    }
    // Migrate legacy single-bill draft
    const draftRaw = localStorage.getItem(LEGACY_DRAFT_KEY);
    if (draftRaw) {
      const raw = JSON.parse(draftRaw) as Record<string, unknown>;
      const bill: Bill = {
        title: String(raw.title ?? ""),
        participants: (raw.participants as Bill["participants"]) ?? [],
        items: (raw.items as Bill["items"]) ?? [],
        tax: Number(raw.tax ?? 0),
        tip: Number(raw.tip ?? 0),
      };
      const migrated: LocalBill = {
        id: crypto.randomUUID(),
        bill,
        updatedAt: Date.now(),
      };
      const existing = JSON.parse(
        localStorage.getItem(LOCAL_KEY) ?? "[]",
      ) as LocalBill[];
      const merged = [migrated, ...existing];
      localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
      localStorage.removeItem(LEGACY_DRAFT_KEY);
      return merged;
    }
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as LocalBill[]) : [];
  } catch {
    return [];
  }
}

function loadSharedBills(): SharedBill[] {
  try {
    const raw = localStorage.getItem(SHARED_KEY);
    if (!raw) return [];
    const bills = JSON.parse(raw) as SharedBill[];
    const now = Date.now();
    const valid = bills.filter((b) => b.expiresAt > now);
    if (valid.length !== bills.length) {
      localStorage.setItem(SHARED_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

function loadSettings(): SplitterSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw
      ? (JSON.parse(raw) as SplitterSettings)
      : { skipShareDialog: false };
  } catch {
    return { skipShareDialog: false };
  }
}

function saveSettings(s: SplitterSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function upsertLocal(bills: LocalBill[], updated: LocalBill): LocalBill[] {
  const idx = bills.findIndex((b) => b.id === updated.id);
  if (idx === -1) return [...bills, updated];
  return bills.map((b) => (b.id === updated.id ? updated : b));
}

function upsertShared(bills: SharedBill[], updated: SharedBill): SharedBill[] {
  const idx = bills.findIndex((b) => b.shareCode === updated.shareCode);
  if (idx === -1) return [...bills, updated];
  return bills.map((b) => (b.shareCode === updated.shareCode ? updated : b));
}

export function useBillsStore() {
  const [localBills, setLocalBills] = useState<LocalBill[]>(loadLocalBills);
  const [sharedBills, setSharedBills] = useState<SharedBill[]>(loadSharedBills);
  const [settings, setSettings] = useState<SplitterSettings>(loadSettings);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Mirrors localBills so a save can persist synchronously without waiting for
  // React to run a setState updater. This matters on the first edit of a new
  // bill: mutate() navigates to /splitter/:id right after saving, and the
  // route's loader reads localStorage immediately — if the write is deferred
  // to the updater, the loader finds nothing and bounces back to /new.
  const localBillsRef = useRef(localBills);

  const persistLocal = useCallback((next: LocalBill[]) => {
    localBillsRef.current = next;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    } catch {
      /* storage full */
    }
    setLocalBills(next);
  }, []);

  const saveLocalBill = useCallback(
    (bill: LocalBill) => {
      persistLocal(upsertLocal(localBillsRef.current, bill));
    },
    [persistLocal],
  );

  /**
   * Drops the local record only. Sharing uses this because the bill graduates
   * to a shared one rather than going away — its receipt should survive.
   */
  const forgetLocalBill = useCallback(
    (id: string) => {
      persistLocal(localBillsRef.current.filter((b) => b.id !== id));
    },
    [persistLocal],
  );

  /** The user deleting a bill outright — its receipt goes too. */
  const deleteLocalBill = useCallback(
    (id: string) => {
      void deleteReceipt(id);
      forgetLocalBill(id);
    },
    [forgetLocalBill],
  );

  const saveSharedBill = useCallback((bill: SharedBill) => {
    setSharedBills((prev) => {
      const next = upsertShared(prev, bill);
      try {
        localStorage.setItem(SHARED_KEY, JSON.stringify(next));
      } catch {
        /* storage full */
      }
      return next;
    });
  }, []);

  const removeSharedBill = useCallback((shareCode: string) => {
    setSharedBills((prev) => {
      const next = prev.filter((b) => b.shareCode !== shareCode);
      try {
        localStorage.setItem(SHARED_KEY, JSON.stringify(next));
      } catch {
        /* storage full */
      }
      return next;
    });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  const showToast = useCallback((text: string, type: "success" | "error") => {
    setToast({ text, type });
  }, []);

  const initiateShare = useCallback(
    (activeBill: LocalBill) => {
      if (activeBill.shareCode && activeBill.shareUrl) {
        navigator.clipboard.writeText(activeBill.shareUrl).then(() => {
          showToast("Link copied!", "success");
        });
        return;
      }
      if (settings.skipShareDialog) {
        return "confirm" as const;
      }
      setShareDialogOpen(true);
    },
    [settings.skipShareDialog, showToast],
  );

  const confirmShare = useCallback(
    async (activeBill: LocalBill, onSuccess?: (code: string) => void) => {
      if (sharing) return;
      setSharing(true);
      setShareDialogOpen(false);
      try {
        const res = await fetch("/api/share-bill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bill: activeBill.bill }),
        });
        if (!res.ok) throw new Error("Server error");
        const { url, code } = (await res.json()) as {
          url: string;
          code: string;
        };
        const now = Date.now();
        saveSharedBill({
          shareCode: code,
          shareUrl: url,
          bill: activeBill.bill,
          cachedAt: now,
          expiresAt: now + SHARED_TTL,
        });
        forgetLocalBill(activeBill.id);
        onSuccess?.(code);
      } catch {
        showToast("Failed to create share link.", "error");
      } finally {
        setSharing(false);
      }
    },
    [sharing, saveSharedBill, forgetLocalBill, showToast],
  );

  const updateSettings = useCallback((patch: Partial<SplitterSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const clearAllData = useCallback(() => {
    void clearReceipts();
    localStorage.removeItem(LOCAL_KEY);
    localStorage.removeItem(SHARED_KEY);
    localBillsRef.current = [];
    setLocalBills([]);
    setSharedBills([]);
  }, []);

  return {
    localBills,
    sharedBills,
    settings,
    sharing,
    saveLocalBill,
    deleteLocalBill,
    saveSharedBill,
    removeSharedBill,
    initiateShare,
    confirmShare,
    shareDialogOpen,
    setShareDialogOpen,
    updateSettings,
    clearAllData,
    toast,
    clearToast,
    showToast,
  };
}
