import type { Action } from "~/types";
import { ActionButton } from "~/components/ui/ActionButton";

export interface ProjectItem {
  title: string;
  subtitle: string | null;
  description?: string;
  image_url: string | null;
  actions: Action[];
}

export function ProjectCard({ item }: { item: ProjectItem }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-ctp-surface1/50 bg-ctp-surface0/40 p-4">
      <div className="flex items-center gap-4">
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.title}
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0">
          <h3 className="font-bold text-ctp-text">{item.title}</h3>
          {item.subtitle && (
            <p className="text-sm text-ctp-overlay1">{item.subtitle}</p>
          )}
        </div>
      </div>
      {item.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.actions.map((action) => (
            <ActionButton key={action.href} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}
