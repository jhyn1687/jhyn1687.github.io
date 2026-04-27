import { Link, useOutletContext } from "react-router";
import { MdAdd, MdMenu, MdScanner } from "react-icons/md";
import type { Route } from "./+types/splitter";
import type { SplitterLayoutContext } from "~/splitter/routes/splitter.layout";
import type { LocalBill, SharedBill } from "~/splitter/types";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Splitter" },
    {
      name: "description",
      content: "Split bills with friends, no login required.",
    },
  ];
}

export function clientLoader() {
  return {};
}

export function HydrateFallback() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <span className="text-ctp-subtext1">Loading…</span>
    </div>
  );
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function ParticipantAvatars({
  participants,
}: {
  participants: LocalBill["bill"]["participants"];
}) {
  const max = 4;
  const visible = participants.slice(0, max);
  const overflow = participants.length - max;

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((p) => (
        <div
          key={p.id}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-ctp-base ${p.color.avatar}`}
          title={p.name}
        >
          {p.name.charAt(0).toUpperCase() || "?"}
        </div>
      ))}
      {overflow > 0 && (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ctp-surface1 text-[10px] font-bold text-ctp-subtext1 ring-1 ring-ctp-base">
          +{overflow}
        </div>
      )}
    </div>
  );
}

function DraftCard({ bill }: { bill: LocalBill }) {
  const itemCount = bill.bill.items.length;
  const personCount = bill.bill.participants.length;

  return (
    <Link
      to={`/splitter/${bill.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-ctp-surface1/50 bg-ctp-surface0/40 p-4 transition-colors hover:border-ctp-teal/40 hover:bg-ctp-surface0/70"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate font-mono text-sm font-semibold text-ctp-text transition-colors group-hover:text-ctp-teal">
          {bill.bill.title || "Untitled Bill"}
        </p>
        {bill.shareCode && (
          <span className="shrink-0 rounded-full border border-ctp-teal/20 bg-ctp-teal/10 px-2 py-0.5 text-[10px] font-semibold text-ctp-teal">
            Shared
          </span>
        )}
      </div>
      {personCount > 0 && (
        <ParticipantAvatars participants={bill.bill.participants} />
      )}
      <div className="mt-auto flex items-center justify-between">
        <p className="text-xs text-ctp-overlay0">
          {itemCount} item{itemCount !== 1 ? "s" : ""} · {personCount}{" "}
          {personCount !== 1 ? "people" : "person"}
        </p>
        <p className="text-xs text-ctp-overlay0">
          {relativeTime(bill.updatedAt)}
        </p>
      </div>
    </Link>
  );
}

function SharedCard({ bill }: { bill: SharedBill }) {
  const itemCount = bill.bill.items.length;
  const personCount = bill.bill.participants.length;

  return (
    <Link
      to={`/splitter/share/${bill.shareCode}`}
      className="group flex flex-col gap-3 rounded-xl border border-ctp-surface1/50 bg-ctp-surface0/40 p-4 transition-colors hover:border-ctp-mauve/40 hover:bg-ctp-surface0/70"
    >
      <p className="truncate font-mono text-sm font-semibold text-ctp-text transition-colors group-hover:text-ctp-mauve">
        {bill.bill.title || "Untitled Bill"}
      </p>
      {personCount > 0 && (
        <ParticipantAvatars participants={bill.bill.participants} />
      )}
      <div className="mt-auto flex items-center justify-between">
        <p className="text-xs text-ctp-overlay0">
          {itemCount} item{itemCount !== 1 ? "s" : ""} · {personCount}{" "}
          {personCount !== 1 ? "people" : "person"}
        </p>
        <p className="text-xs text-ctp-overlay0">
          {relativeTime(bill.cachedAt)}
        </p>
      </div>
    </Link>
  );
}

export default function SplitterDashboard() {
  const { store, onMobileMenu } = useOutletContext<SplitterLayoutContext>();

  const sortedLocal = [...store.localBills].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
  const sortedShared = [...store.sharedBills].sort(
    (a, b) => b.cachedAt - a.cachedAt,
  );
  const hasBills = sortedLocal.length > 0 || sortedShared.length > 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Mobile-only header */}
      <header className="flex items-center gap-3 border-b border-ctp-surface1/50 bg-ctp-base/85 px-4 py-3 backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={onMobileMenu}
          className="shrink-0 rounded-lg p-1.5 text-ctp-subtext1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
          aria-label="Open menu"
        >
          <MdMenu size={20} />
        </button>
        <span className="font-mono text-lg font-extrabold text-ctp-text">
          splitter<span className="text-ctp-teal">.jhyn</span>
        </span>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-10">
          {/* CTA */}
          <div
            className={[
              "flex flex-col items-center rounded-2xl border border-ctp-surface1/50 bg-ctp-surface0/30 px-8 text-center",
              hasBills ? "py-10" : "py-16",
            ].join(" ")}
          >
            <p className="mb-1 font-mono text-2xl font-extrabold text-ctp-text">
              Split a bill
            </p>
            <p className="mb-8 text-sm text-ctp-subtext0">
              No login required · Bills auto-save locally
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/splitter/new"
                className="flex items-center gap-2 rounded-full bg-ctp-teal px-6 py-3 text-sm font-bold text-ctp-base transition-opacity hover:opacity-90"
              >
                <MdAdd size={18} />
                New Bill
              </Link>
              <Link
                to="/splitter/new?scan=1"
                className="flex items-center gap-2 rounded-full border border-ctp-surface1/50 bg-ctp-surface0 px-6 py-3 text-sm font-semibold text-ctp-subtext1 transition-colors hover:border-ctp-teal/50 hover:bg-ctp-surface1 hover:text-ctp-teal"
              >
                <MdScanner size={18} />
                Scan Receipt
              </Link>
            </div>
          </div>

          {/* Drafts */}
          {sortedLocal.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ctp-overlay0">
                Drafts
                <span className="ml-1.5 text-ctp-overlay1">
                  ({sortedLocal.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sortedLocal.map((b) => (
                  <DraftCard key={b.id} bill={b} />
                ))}
              </div>
            </section>
          )}

          {/* Shared */}
          {sortedShared.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ctp-overlay0">
                Shared
                <span className="ml-1.5 text-ctp-overlay1">
                  ({sortedShared.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sortedShared.map((b) => (
                  <SharedCard key={b.shareCode} bill={b} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
