import { redirect } from "react-router";
import type { Route } from "./+types/splitter.$billId";
import { SplitterShell } from "~/components/splitter/SplitterShell";
import type { SavedBill } from "~/components/splitter/types";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Splitter — Tony Yuan" },
    { name: "description", content: "Split bills with friends, no login required." },
  ];
}

export function clientLoader({ params }: Route.ClientLoaderArgs): { savedBill: SavedBill } | Response {
  const { billId } = params;
  try {
    const raw = localStorage.getItem("splitter_bills");
    const bills: SavedBill[] = raw ? JSON.parse(raw) : [];
    const found = bills.find((b) => b.id === billId);
    if (found) return { savedBill: found };
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
  return <SplitterShell initialSavedBill={loaderData.savedBill} />;
}
