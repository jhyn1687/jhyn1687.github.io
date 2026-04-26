import type { Action } from "~/portfolio/types";
import { Icon } from "~/portfolio/components/Icon";

function resolveHref(action: Action): string {
  if (action.type === "mailto") {
    return `mailto:${action.href}`;
  }
  return action.href;
}

export function ActionButton({ action }: { action: Action }) {
  return (
    <a
      href={resolveHref(action)}
      download={action.type === "download" || undefined}
      className="inline-flex items-center gap-2 rounded-lg border border-ctp-surface2/50 bg-ctp-surface0/40 px-4 py-2 text-sm text-ctp-text transition-all hover:border-ctp-teal/50 hover:bg-ctp-surface1/40 hover:[box-shadow:0_0_10px_2px_color-mix(in_srgb,var(--catppuccin-color-teal)_30%,transparent)]"
    >
      <Icon name={action.icon} size={16} />
      {action.label}
    </a>
  );
}
