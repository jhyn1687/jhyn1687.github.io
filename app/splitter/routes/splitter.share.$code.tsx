import type { Route } from "./+types/splitter.share.$code";
import { SplitterShell } from "~/splitter/components/SplitterShell";
import type { Bill, SharedBill } from "~/splitter/types";

const SHARED_TTL = 30 * 24 * 60 * 60 * 1000;
const SHARED_KEY = "splitter_shared_bills";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Splitter" },
    { name: "description", content: "Viewing a shared bill." },
  ];
}

export async function clientLoader({
  params,
}: Route.ClientLoaderArgs): Promise<{
  sharedBill: SharedBill | null;
  error?: string;
}> {
  const { code } = params;

  // Check cache — skip if expired
  try {
    const raw = localStorage.getItem(SHARED_KEY);
    const bills: SharedBill[] = raw ? JSON.parse(raw) : [];
    const cached = bills.find((b) => b.shareCode === code);
    if (cached && cached.expiresAt > Date.now()) {
      return { sharedBill: cached };
    }
  } catch {
    // fall through
  }

  // Fetch from API
  try {
    const res = await fetch(`/api/bill/${code}`);
    if (!res.ok) {
      // Remove stale cache entry if it exists
      try {
        const raw = localStorage.getItem(SHARED_KEY);
        const bills: SharedBill[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem(
          SHARED_KEY,
          JSON.stringify(bills.filter((b) => b.shareCode !== code)),
        );
      } catch {
        /* non-fatal */
      }
      return {
        sharedBill: null,
        error: "This share link has expired or doesn't exist.",
      };
    }
    const { bill } = (await res.json()) as { bill: Bill };
    const now = Date.now();
    const sharedBill: SharedBill = {
      shareCode: code,
      shareUrl: window.location.href,
      bill: { ...bill, tax: bill.tax ?? 0, tip: bill.tip ?? 0 },
      cachedAt: now,
      expiresAt: now + SHARED_TTL,
    };
    try {
      const raw = localStorage.getItem(SHARED_KEY);
      const bills: SharedBill[] = raw ? JSON.parse(raw) : [];
      const filtered = bills.filter((b) => b.shareCode !== code);
      localStorage.setItem(
        SHARED_KEY,
        JSON.stringify([...filtered, sharedBill]),
      );
    } catch {
      /* non-fatal */
    }
    return { sharedBill };
  } catch {
    return { sharedBill: null, error: "Failed to load the shared bill." };
  }
}

export function HydrateFallback() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <span className="text-ctp-subtext1">Loading…</span>
    </div>
  );
}

export default function SplitterSharePage({
  loaderData,
}: Route.ComponentProps) {
  return (
    <SplitterShell
      initialLocalBill={null}
      sharedBill={loaderData.sharedBill}
      error={loaderData.error}
    />
  );
}
