import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { MdAdd, MdChevronRight, MdSettings } from "react-icons/md";
import type { LocalBill, SharedBill } from "./types";

interface BillSidebarProps {
  localBills: LocalBill[];
  sharedBills: SharedBill[];
  mobileOpen: boolean;
  onClose: () => void;
}

function SidebarSection<T extends { bill: { title: string } }>({
  label,
  bills,
  getKey,
  getLink,
  isActive,
}: {
  label: string;
  bills: T[];
  getKey: (b: T) => string;
  getLink: (b: T) => string;
  isActive: (b: T) => boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-1 px-4 py-1.5 text-left"
      >
        <span className="flex-1 text-[10.5px] font-bold uppercase tracking-wider text-ctp-overlay0">
          {label}
          {bills.length > 0 && (
            <span className="ml-1.5 text-ctp-overlay1">({bills.length})</span>
          )}
        </span>
        <MdChevronRight
          size={14}
          className={[
            "shrink-0 text-ctp-overlay0 transition-transform duration-150",
            expanded ? "rotate-90" : "",
          ].join(" ")}
        />
      </button>
      {expanded && (
        <div>
          {bills.length === 0 ? (
            <p className="px-4 pb-2 text-xs italic text-ctp-overlay0">None yet</p>
          ) : (
            bills.map((b) => {
              const active = isActive(b);
              return (
                <Link
                  key={getKey(b)}
                  to={getLink(b)}
                  className={[
                    "relative flex items-center gap-2 overflow-hidden px-4 py-1.5 text-[13px] transition-colors",
                    active
                      ? "bg-ctp-surface0 font-semibold text-ctp-text"
                      : "text-ctp-subtext0 hover:bg-ctp-surface0/50 hover:text-ctp-text",
                  ].join(" ")}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-[55%] w-[3px] -translate-y-1/2 rounded-r bg-ctp-teal" />
                  )}
                  <span
                    className={[
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      active ? "bg-ctp-teal" : "bg-ctp-surface2",
                    ].join(" ")}
                  />
                  <span className="truncate">
                    {b.bill.title || "Untitled Bill"}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function BillSidebar({
  localBills,
  sharedBills,
  mobileOpen,
  onClose,
}: BillSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const localMatch = location.pathname.match(/^\/splitter\/([^/]+)$/);
  const shareMatch = location.pathname.match(/^\/splitter\/share\/([^/]+)$/);
  const activeBillId = localMatch ? localMatch[1] : null;
  const activeShareCode = shareMatch ? shareMatch[1] : null;

  const sortedLocal = [...localBills].sort((a, b) => b.updatedAt - a.updatedAt);
  const sortedShared = [...sharedBills].sort((a, b) => b.cachedAt - a.cachedAt);

  return (
    <>
      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          "fixed left-0 top-0 z-50 flex h-screen w-[220px] shrink-0 flex-col border-r border-ctp-surface1/50 bg-ctp-mantle transition-transform duration-250 ease-in-out md:relative md:z-auto md:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="border-b border-ctp-surface1/50 px-5 py-5 font-mono text-xl font-extrabold tracking-tight text-ctp-text">
          splitter<span className="text-ctp-teal">.jhyn</span>
        </div>

        {/* New Bill */}
        <button
          type="button"
          onClick={() => {
            navigate("/splitter/new");
            onClose();
          }}
          className="mx-3 my-3 flex items-center gap-2 rounded-lg bg-ctp-teal px-3.5 py-2 text-[13px] font-semibold text-ctp-base transition-opacity hover:opacity-90"
        >
          <MdAdd size={15} />
          New Bill
        </button>

        <div className="h-px bg-ctp-surface1/50" />

        {/* Bill lists */}
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto py-2">
          <SidebarSection
            label="Shared"
            bills={sortedShared}
            getKey={(b) => b.shareCode}
            getLink={(b) => `/splitter/share/${b.shareCode}`}
            isActive={(b) => b.shareCode === activeShareCode}
          />
          <div className="h-px bg-ctp-surface1/50" />
          <SidebarSection
            label="My Bills"
            bills={sortedLocal}
            getKey={(b) => b.id}
            getLink={(b) => `/splitter/${b.id}`}
            isActive={(b) => b.id === activeBillId}
          />
        </div>

        {/* Settings footer */}
        <div className="border-t border-ctp-surface1/50">
          <Link
            to="/splitter/settings"
            onClick={onClose}
            className="flex items-center gap-2.5 px-4 py-3 text-[13px] text-ctp-subtext0 transition-colors hover:bg-ctp-surface0/50 hover:text-ctp-text"
          >
            <MdSettings size={15} />
            Settings
          </Link>
        </div>
      </aside>
    </>
  );
}
