/** Unified action type for buttons/links across all sections */
export interface Action {
  type: "link" | "download" | "mailto";
  label: string;
  href: string;
  icon: string | null;
}

/** A section row from the Supabase sections table */
export interface Section {
  id: number;
  type: string;
  props: Record<string, unknown>;
  order: number;
  visible: boolean;
}

/** Props for section components — each section receives its props blob */
export interface SectionComponentProps {
  props: Record<string, unknown>;
}
