import { redirect } from "react-router";
import type { Route } from "./+types/splitter";
import type { LocalBill } from "~/splitter/types";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Splitter" },
    {
      name: "description",
      content: "Split bills with friends, no login required.",
    },
  ];
}

export function clientLoader(): Response {
  try {
    const raw = localStorage.getItem("splitter_local_bills");
    const bills: LocalBill[] = raw ? JSON.parse(raw) : [];
    const latest = bills.sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (latest) {
      return redirect(`/splitter/${latest.id}`);
    }
  } catch {
    // fall through
  }
  return redirect("/splitter/new");
}

export function HydrateFallback() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <span className="text-ctp-subtext1">Loading…</span>
    </div>
  );
}

export default function SplitterIndex() {
  return null;
}
