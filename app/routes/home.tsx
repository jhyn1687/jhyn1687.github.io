import type { Route } from "./+types/home";
import type { Section } from "~/types";
import { getSupabaseClient } from "~/utils/supabase.server";
import { getSection } from "~/components/registry";
import { RippleBackground } from "~/components/ui/RippleBackground";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Tony Yuan" },
    { name: "description", content: "Tony Yuan's Portfolio" },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const supabase = getSupabaseClient(context.cloudflare.env);
  const { data } = await supabase
    .from("sections")
    .select("*")
    .eq("visible", true)
    .order("order");
  return { sections: (data ?? []) as Section[] };
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
