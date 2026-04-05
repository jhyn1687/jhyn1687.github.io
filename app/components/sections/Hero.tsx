import ReactMarkdown from "react-markdown";
import type { Action } from "~/types";
import { ActionButton } from "../ui/ActionButton";

interface HeroProps {
  bio: string[];
  actions: Action[];
}

export function Hero({ props }: { props: Record<string, unknown> }) {
  const { bio, actions } = props as unknown as HeroProps;

  return (
    <section className="py-16">
      <div className="prose prose-invert max-w-none">
        {bio.map((paragraph, i) => (
          <ReactMarkdown
            key={i}
            components={{
              p: ({ children }) => (
                <p className="mb-4 text-lg leading-relaxed text-ctp-subtext1">
                  {children}
                </p>
              ),
              strong: ({ children }) => (
                <strong className="font-bold text-ctp-text">{children}</strong>
              ),
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
            {paragraph}
          </ReactMarkdown>
        ))}
      </div>
      {actions.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-3">
          {actions.map((action) => (
            <ActionButton key={action.href} action={action} />
          ))}
        </div>
      )}
    </section>
  );
}
