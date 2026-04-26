import type { Route } from "./+types/splitter.new";
import { SplitterShell } from "~/components/splitter/SplitterShell";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "New Bill — Splitter" },
    { name: "description", content: "Split bills with friends, no login required." },
  ];
}

export function clientLoader() {
  return { ok: true };
}

export function HydrateFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ctp-base">
      <span className="font-mono text-ctp-subtext1">Loading…</span>
    </div>
  );
}

export default function SplitterNewPage() {
  return <SplitterShell initialLocalBill={null} isNew />;
}
