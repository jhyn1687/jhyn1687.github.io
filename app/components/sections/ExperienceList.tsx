import { SectionHeader } from "~/components/ui/SectionHeader";
import {
  ExperienceCard,
  type ExperienceItem,
} from "~/components/ui/ExperienceCard";

interface ExperienceListProps {
  title: string;
  children: ExperienceItem[];
}

export function ExperienceList({ props }: { props: Record<string, unknown> }) {
  const { title, children } = props as unknown as ExperienceListProps;

  return (
    <section className="py-16">
      <SectionHeader title={title} />
      <div className="relative flex flex-col">
        {/* vertical dashed line */}
        <div className="absolute top-0 bottom-0 left-1.75 w-px border-l-2 border-dashed border-ctp-surface2" />
        {children.map((item, i) => (
          <ExperienceCard key={i} item={item} />
        ))}
      </div>
    </section>
  );
}
