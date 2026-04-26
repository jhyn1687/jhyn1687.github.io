import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { MdAdd, MdChevronRight, MdClose, MdSettings } from "react-icons/md";
import type { LocalBill, SharedBill } from "~/splitter/types";

interface BillSidebarProps {
  localBills: LocalBill[];
  sharedBills: SharedBill[];
  mobileOpen: boolean;
  onClose: () => void;
  onDeleteLocal: (id: string) => void;
  onDeleteShared: (code: string) => void;
}

function SidebarSection<T extends { bill: { title: string } }>({
  label,
  bills,
  getKey,
  getLink,
  isActive,
  onDelete,
}: {
  label: string;
  bills: T[];
  getKey: (b: T) => string;
  getLink: (b: T) => string;
  isActive: (b: T) => boolean;
  onDelete: (b: T) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="px-1">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-0.75 px-2 py-1.5 text-left"
      >
        <span className="flex-1 text-xs font-bold uppercase tracking-wider text-ctp-overlay0">
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
        <div className="flex flex-col gap-1">
          {bills.length === 0 ? (
            <p className="px-3 py-1.5 text-xs italic text-ctp-overlay0">
              None yet
            </p>
          ) : (
            bills.map((b) => {
              const active = isActive(b);
              return (
                <div key={getKey(b)} className="group relative">
                  <Link
                    to={getLink(b)}
                    className={[
                      "relative flex items-center gap-2 overflow-hidden px-3 py-1.5 pr-8 text-xs rounded transition-colors",
                      active
                        ? "bg-ctp-surface0 font-semibold text-ctp-text"
                        : "text-ctp-subtext0 hover:bg-ctp-surface0/50 hover:text-ctp-text",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute left-0 top-1/2 h-[85%] w-0.75 -translate-y-1/2 rounded",
                        active ? "bg-ctp-teal" : "bg-ctp-surface1",
                      ].join(" ")}
                    />
                    <span className="truncate">
                      {b.bill.title || "Untitled Bill"}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(b)}
                    aria-label="Delete bill"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ctp-overlay0 opacity-0 transition-opacity hover:bg-ctp-surface1 hover:text-ctp-text group-hover:opacity-100"
                  >
                    <MdClose size={13} />
                  </button>
                </div>
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
  onDeleteLocal,
  onDeleteShared,
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
          "fixed left-0 top-0 z-50 flex h-screen w-75 shrink-0 flex-col border-r border-ctp-surface1/50 bg-ctp-mantle transition-transform duration-250 ease-in-out md:relative md:z-auto md:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="border-b border-ctp-surface1/50 px-3 py-3 font-mono text-xl font-extrabold tracking-tight text-ctp-text">
          <span className="inline-block h-7.5">
            splitter<span className="text-ctp-teal">.jhyn</span>
          </span>
        </div>

        {/* New Bill */}
        <div className="flex flex-col overflow-y-auto p-0.75 gap-1">
          <Link
            to="/splitter/new"
            onClick={onClose}
            className="flex items-center gap-2 text-ctp-teal text-xs px-2 py-1.5 pr-8 font-semibold transition-opacity rounded hover:bg-ctp-surface0/50"
          >
            <MdAdd size={13} />
            New Bill
          </Link>
          <Link
            to="/splitter/settings"
            onClick={onClose}
            className="flex items-center gap-2 text-ctp-subtext0 text-xs px-2 py-1.5 pr-8 font-semibold transition-opacity rounded hover:bg-ctp-surface0/50"
          >
            <MdSettings size={13} />
            Settings
          </Link>
        </div>

        <div className="h-px bg-ctp-surface1/50" />

        {/* Bill lists */}
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto py-1">
          <SidebarSection
            label="Shared"
            bills={sortedShared}
            getKey={(b) => b.shareCode}
            getLink={(b) => `/splitter/share/${b.shareCode}`}
            isActive={(b) => b.shareCode === activeShareCode}
            onDelete={(b) => {
              onDeleteShared(b.shareCode);
              if (b.shareCode === activeShareCode) navigate("/splitter/new");
            }}
          />
          <div className="h-px bg-ctp-surface1/50" />
          <SidebarSection
            label="Drafts"
            bills={sortedLocal}
            getKey={(b) => b.id}
            getLink={(b) => `/splitter/${b.id}`}
            isActive={(b) => b.id === activeBillId}
            onDelete={(b) => {
              onDeleteLocal(b.id);
              if (b.id === activeBillId) navigate("/splitter/new");
            }}
          />
        </div>

        <div className="h-px bg-ctp-surface1/50" />
      </aside>
    </>
  );
}
