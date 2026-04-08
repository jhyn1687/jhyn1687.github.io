import type { Action } from "~/types";

export interface ExperienceItem {
  job_title: string;
  company: string;
  highlights: string[];
  actions: Action[];
  current?: boolean;
}

export function ExperienceCard({ item }: { item: ExperienceItem }) {
  return (
    <div className="relative flex gap-6 pb-10 last:pb-0">
      {/* marker */}
      <div className="relative z-10 mt-1 flex h-4 w-4 shrink-0 items-center justify-center">
        {item.current ? (
          <div className="h-3 w-3 rounded-full border-2 border-ctp-teal [box-shadow:0_0_8px_2px_color-mix(in_srgb,var(--catppuccin-color-teal)_40%,transparent)]" />
        ) : (
          <span className="text-sm font-bold leading-none text-ctp-overlay1">
            ×
          </span>
        )}
      </div>

      {/* content */}
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-row justify-between">
          <span
            className={`font-bold ${item.current ? "text-ctp-teal" : "text-ctp-text"}`}
          >
            {item.job_title}
          </span>
          <span className="text-ctp-subtext0">{item.company}</span>
        </div>
        {item.highlights.length > 0 && (
          <ul className="flex flex-col gap-1">
            {item.highlights.map((h, j) => (
              <li
                key={j}
                className="text-sm text-ctp-subtext0 before:mr-2 before:content-['–']"
              >
                {h}
              </li>
            ))}
          </ul>
        )}
        {item.actions.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {item.actions.map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="text-sm text-ctp-overlay1 underline decoration-ctp-surface2 underline-offset-2 transition-colors hover:text-ctp-teal hover:decoration-ctp-teal/50"
              >
                {action.label} ↗
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
