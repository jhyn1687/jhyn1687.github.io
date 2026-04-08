import type { ComponentType } from "react";
import type { SectionComponentProps } from "~/types";

import { Hero } from "./sections/Hero";
import { ExperienceList } from "./sections/ExperienceList";
import { ProjectList } from "./sections/ProjectList";

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
