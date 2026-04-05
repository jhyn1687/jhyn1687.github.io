import ReactMarkdown from "react-markdown";
import type { Action } from "~/types";
import { ActionButton } from "../ui/ActionButton";

interface ProjectItem {
  title: string;
  description: string;
  image_url: string | null;
  actions: Action[];
}

interface ProjectListProps {
  title: string;
  subtitle: string;
  children: ProjectItem[];
}

export function ProjectList({ props }: { props: Record<string, unknown> }) {
  const { title, subtitle, children } = props as unknown as ProjectListProps;

  return (
    <section className="py-16">
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-ctp-text">{title}</h2>
        <p className="mt-1 text-sm text-ctp-overlay1">{subtitle}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {children.map((item, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-xl border border-ctp-surface1/50 bg-ctp-surface0/40 p-5"
          >
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.title}
                className="aspect-video w-full rounded-lg object-cover"
              />
            )}
            <div>
              <h3 className="font-bold text-ctp-text">{item.title}</h3>
              {item.description && (
                <div className="mt-1 text-sm text-ctp-subtext0">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2">{children}</p>,
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          className="text-ctp-text underline decoration-ctp-overlay1 underline-offset-2 hover:decoration-ctp-subtext1"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {item.description}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            {item.actions.length > 0 && (
              <div className="mt-auto flex flex-wrap gap-2">
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
