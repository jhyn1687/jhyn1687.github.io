import type { Route } from "./+types/resume.pdf";
import { getSupabaseClient, getPublicUrl } from "~/utils/supabase.server";

const RESUME_PATH = "jhyn_resume.pdf";

export async function loader({ context }: Route.LoaderArgs) {
  const supabase = getSupabaseClient(context.cloudflare.env);

  const publicUrl = getPublicUrl(supabase, "files", RESUME_PATH);

  const res = await fetch(publicUrl);

  if (!res.ok || !res.body) {
    throw new Response("Resume not found", { status: 404 });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="resume.pdf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
