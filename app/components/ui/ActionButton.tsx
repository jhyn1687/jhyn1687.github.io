import type { Action } from "~/types";
import { Icon } from "./Icon";

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
      className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm transition-colors hover:border-white/40 hover:bg-white/10"
    >
      <Icon name={action.icon} size={16} />
      {action.label}
    </a>
  );
}
