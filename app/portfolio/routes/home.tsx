import type { Route } from "./+types/home";
import type { Section } from "~/portfolio/types";
import { getSupabaseClient, getImageUrl } from "~/utils/supabase.server";
import { getSection } from "~/portfolio/registry";
import { RippleBackground } from "~/portfolio/components/RippleBackground";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Tony Yuan" },
    { name: "description", content: "Tony Yuan's Portfolio" },
    { name: "color-scheme", content: "dark" },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const supabase = getSupabaseClient(context.cloudflare.env);
  const { data } = await supabase
    .from("sections")
    .select("*")
    .eq("visible", true)
    .order("order");

  const sections = (data ?? []).map((section) => {
    const children = section.props?.children;
    if (!Array.isArray(children)) return section;
    return {
      ...section,
      props: {
        ...section.props,
        children: children.map((child: Record<string, unknown>) => {
          if (typeof child.image_path !== "string") return child;
          return {
            ...child,
            image_url: getImageUrl(supabase, "images", child.image_path),
          };
        }),
      },
    };
  });

  return { sections: sections as Section[] };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const sections = loaderData.sections as Section[];

  return (
    <>
      <RippleBackground />
      <main className="mx-auto max-w-2xl px-6">
        {sections.map((section) => {
          const Component = getSection(section.type);
          if (!Component) return null;
          return <Component key={section.id} props={section.props} />;
        })}
      </main>
    </>
  );
}
