import { redirect } from "react-router";
import type { Route } from "./+types/splitter.$billId";
import { SplitterShell } from "~/components/splitter/SplitterShell";
import type { LocalBill } from "~/components/splitter/types";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Splitter — Tony Yuan" },
    { name: "description", content: "Split bills with friends, no login required." },
  ];
}

export function clientLoader({ params }: Route.ClientLoaderArgs): { localBill: LocalBill } | Response {
  const { billId } = params;
  try {
    const raw = localStorage.getItem("splitter_local_bills");
    const bills: LocalBill[] = raw ? JSON.parse(raw) : [];
    const found = bills.find((b) => b.id === billId);
    if (found) return { localBill: found };
  } catch {
    // fall through
  }
  return redirect("/splitter/new");
}

export function HydrateFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ctp-base">
      <span className="font-mono text-ctp-subtext1">Loading…</span>
    </div>
  );
}

export default function SplitterBillPage({ loaderData }: Route.ComponentProps) {
  // key forces remount (and fresh state) when navigating between different bills
  return <SplitterShell key={loaderData.localBill.id} initialLocalBill={loaderData.localBill} />;
}
