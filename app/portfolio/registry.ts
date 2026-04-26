import type { ComponentType } from "react";
import type { SectionComponentProps } from "~/portfolio/types";

import { Hero } from "~/portfolio/components/Hero";
import { ExperienceList } from "~/portfolio/components/ExperienceList";
import { ProjectList } from "~/portfolio/components/ProjectList";

const registry: Record<string, ComponentType<SectionComponentProps>> = {
  hero: Hero,
  experience_list: ExperienceList,
  project_list: ProjectList,
};

export function getSection(
  type: string,
): ComponentType<SectionComponentProps> | null {
  return registry[type] ?? null;
}
