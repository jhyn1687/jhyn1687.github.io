import { useCallback, useEffect, useRef, useState } from "react";
import type { Bill, SavedBill, SplitterSettings } from "./types";

export type Toast = { text: string; type: "success" | "error" };

const BILLS_KEY = "splitter_bills";
const SETTINGS_KEY = "splitter_settings";
const LEGACY_KEY = "splitter_bill_draft";

function loadBills(): SavedBill[] {
  try {
    // Migrate legacy single-bill draft
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const rawBill = JSON.parse(legacy) as Record<string, unknown>;
      const bill: Bill = {
        title: String(rawBill.title ?? ""),
        participants: (rawBill.participants as Bill["participants"]) ?? [],
        items: (rawBill.items as Bill["items"]) ?? [],
        tax: Number(rawBill.tax ?? 0),
        tip: Number(rawBill.tip ?? 0),
      };
      const migrated: SavedBill = {
        id: crypto.randomUUID(),
        bill,
        updatedAt: Date.now(),
        isShared: false,
      };
      const existing = JSON.parse(localStorage.getItem(BILLS_KEY) ?? "[]") as SavedBill[];
      const merged = [migrated, ...existing];
      localStorage.setItem(BILLS_KEY, JSON.stringify(merged));
      localStorage.removeItem(LEGACY_KEY);
      return merged;
    }
    const raw = localStorage.getItem(BILLS_KEY);
    return raw ? (JSON.parse(raw) as SavedBill[]) : [];
  } catch {
    return [];
  }
}

function loadSettings(): SplitterSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as SplitterSettings) : { skipShareDialog: false };
  } catch {
    return { skipShareDialog: false };
  }
}

function saveSettings(s: SplitterSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function upsert(bills: SavedBill[], updated: SavedBill): SavedBill[] {
  const idx = bills.findIndex((b) => b.id === updated.id);
  if (idx === -1) return [...bills, updated];
  return bills.map((b) => (b.id === updated.id ? updated : b));
}

export function useBillsStore() {
  const [bills, setBills] = useState<SavedBill[]>(loadBills);
  const [settings, setSettings] = useState<SplitterSettings>(loadSettings);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myBills = bills.filter((b) => !b.isShared).sort((a, b) => b.updatedAt - a.updatedAt);
  const sharedBills = bills.filter((b) => b.isShared).sort((a, b) => b.updatedAt - a.updatedAt);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      localStorage.setItem(BILLS_KEY, JSON.stringify(bills));
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [bills]);

  const saveBill = useCallback((saved: SavedBill) => {
    setBills((prev) => upsert(prev, saved));
  }, []);

  const deleteBill = useCallback((id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  const showToast = useCallback((text: string, type: "success" | "error") => {
    setToast({ text, type });
  }, []);

  const initiateShare = useCallback(
    (activeBill: SavedBill) => {
      if (activeBill.shareCode && activeBill.shareUrl) {
        navigator.clipboard.writeText(activeBill.shareUrl).then(() => {
          showToast("Link copied!", "success");
        });
        return;
      }
      if (settings.skipShareDialog) {
        return "confirm";
      }
      setShareDialogOpen(true);
    },
    [settings.skipShareDialog, showToast],
  );

  const confirmShare = useCallback(
    async (activeBill: SavedBill) => {
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
        const { url, code } = (await res.json()) as { url: string; code: string };
        const updated: SavedBill = {
          ...activeBill,
          shareCode: code,
          shareUrl: url,
          isShared: true,
          updatedAt: Date.now(),
        };
        saveBill(updated);
        await navigator.clipboard.writeText(url);
        showToast("Link copied to clipboard!", "success");
      } catch {
        showToast("Failed to create share link.", "error");
      } finally {
        setSharing(false);
      }
    },
    [sharing, saveBill, showToast],
  );

  const updateSettings = useCallback((patch: Partial<SplitterSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const clearAllData = useCallback(() => {
    localStorage.removeItem(BILLS_KEY);
    setBills([]);
  }, []);

  return {
    bills,
    myBills,
    sharedBills,
    settings,
    sharing,
    saveBill,
    deleteBill,
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
