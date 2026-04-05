import type { Action } from "~/types";
import { ActionButton } from "../ui/ActionButton";

interface ExperienceItem {
  job_title: string;
  company: string;
  start_date: string;
  end_date: string | null;
  highlights: string[];
  actions: Action[];
}

interface ExperienceListProps {
  title: string;
  subtitle: string;
  children: ExperienceItem[];
}

export function ExperienceList({ props }: { props: Record<string, unknown> }) {
  const { title, subtitle, children } = props as unknown as ExperienceListProps;

  return (
    <section className="py-16">
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-ctp-text">{title}</h2>
        <p className="mt-1 text-sm text-ctp-overlay1">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-10">
        {children.map((item, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <span className="font-bold text-ctp-text">
                  {item.job_title}
                </span>
                <span className="text-ctp-subtext0"> @ {item.company}</span>
              </div>
              <span className="shrink-0 text-sm text-ctp-overlay1">
                {item.start_date} — {item.end_date ?? "Present"}
              </span>
            </div>
            {item.highlights.length > 0 && (
              <ul className="ml-4 flex flex-col gap-1">
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
              <div className="flex flex-wrap gap-2">
                {item.actions.map((action) => (
                  <ActionButton key={action.href} action={action} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
