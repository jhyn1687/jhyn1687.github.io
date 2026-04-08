import ReactMarkdown from "react-markdown";
import type { Action } from "~/types";
import { ActionButton } from "~/components/ui/ActionButton";
import { Signature } from "~/components/ui/Signature";

interface HeroProps {
  bio: string[];
  actions: Action[];
}

export function Hero({ props }: { props: Record<string, unknown> }) {
  const { bio, actions } = props as unknown as HeroProps;

  return (
    <section className="pt-[15vh] pb-16">
      <Signature className="mb-12 w-1/2 min-w-64 max-w-xs text-ctp-text" />
      <div>
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
                  className="text-ctp-text underline decoration-ctp-overlay1 underline-offset-2 transition-colors hover:text-ctp-teal hover:decoration-ctp-teal/50 [&_strong]:text-inherit"
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
