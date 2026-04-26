import type { Route } from "./+types/splitter.share.$code";
import { SplitterShell } from "~/components/splitter/SplitterShell";
import type { Bill, SavedBill } from "~/components/splitter/types";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Shared Bill — Splitter" },
    { name: "description", content: "Viewing a shared bill." },
  ];
}

export async function clientLoader({
  params,
}: Route.ClientLoaderArgs): Promise<{ savedBill: SavedBill | null; error?: string }> {
  const { code } = params;

  // Check if already cached locally
  try {
    const raw = localStorage.getItem("splitter_bills");
    const bills: SavedBill[] = raw ? JSON.parse(raw) : [];
    const cached = bills.find((b) => b.shareCode === code);
    if (cached) return { savedBill: cached };
  } catch {
    // fall through
  }

  // Fetch from Supabase via API
  try {
    const res = await fetch(`/api/bill/${code}`);
    if (!res.ok) {
      return { savedBill: null, error: "This share link has expired or doesn't exist." };
    }
    const { bill } = (await res.json()) as { bill: Bill };

    // Save to localStorage as a shared bill
    const id = crypto.randomUUID();
    const savedBill: SavedBill = {
      id,
      bill: { ...bill, tax: bill.tax ?? 0, tip: bill.tip ?? 0 },
      updatedAt: Date.now(),
      shareCode: code,
      shareUrl: window.location.href,
      isShared: true,
    };
    try {
      const raw = localStorage.getItem("splitter_bills");
      const bills: SavedBill[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem("splitter_bills", JSON.stringify([...bills, savedBill]));
    } catch {
      // non-fatal
    }
    return { savedBill };
  } catch {
    return { savedBill: null, error: "Failed to load the shared bill." };
  }
}

export function HydrateFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ctp-base">
      <span className="font-mono text-ctp-subtext1">Loading…</span>
    </div>
  );
}

export default function SplitterSharePage({ loaderData }: Route.ComponentProps) {
  return (
    <SplitterShell
      initialSavedBill={loaderData.savedBill}
      isSharedView
      error={loaderData.error}
    />
  );
}
