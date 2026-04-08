import { SectionHeader } from "~/components/ui/SectionHeader";
import { ProjectCard, type ProjectItem } from "~/components/ui/ProjectCard";

interface ProjectListProps {
  title: string;
  children: ProjectItem[];
}

export function ProjectList({ props }: { props: Record<string, unknown> }) {
  const { title, children } = props as unknown as ProjectListProps;

  return (
    <section className="py-16">
      <SectionHeader title={title} />
      <div className="grid gap-6 sm:grid-cols-2">
        {children.map((item, i) => (
          <ProjectCard key={i} item={item} />
        ))}
      </div>
    </section>
  );
}
