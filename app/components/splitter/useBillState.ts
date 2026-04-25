import { useCallback, useEffect, useRef, useState } from "react";
import type { Bill, Item, Participant } from "./types";

const STORAGE_KEY = "splitter_bill_draft";

export type Toast = { text: string; type: "success" | "error" };

export type OcrItem = { description: string; total_amount: number };

export function useBillState(initialBill: Bill | null) {
  const [title, setTitle] = useState(initialBill?.title ?? "");
  const [participants, setParticipants] = useState<Participant[]>(
    initialBill?.participants ?? [],
  );
  const [items, setItems] = useState<Item[]>(initialBill?.items ?? []);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist draft to localStorage on every state change (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const bill: Bill = { title, participants, items };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bill));
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title, participants, items]);

  const addParticipant = useCallback(() => {
    setParticipants((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "" },
    ]);
  }, []);

  const updateParticipant = useCallback((id: string, name: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p)),
    );
  }, []);

  const removeParticipant = useCallback((id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    // Remove participant from all items' splitBetween
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        splitBetween: item.splitBetween.filter((pid) => pid !== id),
      })),
    );
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", price: NaN, splitBetween: [] },
    ]);
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<Item>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const importItems = useCallback((ocrItems: OcrItem[]) => {
    const newItems: Item[] = ocrItems
      .filter((oi) => oi.description && oi.total_amount > 0)
      .map((oi) => ({
        id: crypto.randomUUID(),
        name: oi.description,
        price: oi.total_amount,
        splitBetween: [],
      }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const handleShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const bill: Bill = { title, participants, items };
      const res = await fetch("/api/share-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bill }),
      });
      if (!res.ok) throw new Error("Server error");
      const { url } = (await res.json()) as { url: string };
      await navigator.clipboard.writeText(url);
      setToast({ text: "Link copied to clipboard!", type: "success" });
    } catch {
      setToast({ text: "Failed to create share link.", type: "error" });
    } finally {
      setSharing(false);
    }
  }, [title, participants, items, sharing]);

  const handleReset = useCallback(() => {
    setTitle("");
    setParticipants([]);
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  return {
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
  };
}
