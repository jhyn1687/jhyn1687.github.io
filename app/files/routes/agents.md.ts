import type { Route } from "./+types/agents.md";
import { getSupabaseClient, getPublicUrl } from "~/utils/supabase.server";

const AGENTS_PATH = "AGENTS.md";

// Deliberately not the repo's own AGENTS.md. That file documents how to *work
// on* this codebase; this one describes the running site to agents that visit
// it. Keeping it in the `files` bucket rather than the bundle means it can be
// reworded by re-uploading the object, with no redeploy.
export async function loader({ context, request }: Route.LoaderArgs) {
  const supabase = getSupabaseClient(context.cloudflare.env);

  const publicUrl = getPublicUrl(supabase, "files", AGENTS_PATH);

  const res = await fetch(publicUrl);

  if (!res.ok || !res.body) {
    throw new Response("AGENTS.md not found", { status: 404 });
  }

  // Browsers download text/markdown instead of rendering it, which makes the
  // URL useless to a human who just clicks it. Agents fetching the file send no
  // Accept: text/html, so they still get the accurate type.
  const wantsHtml = request.headers.get("Accept")?.includes("text/html");

  // The object's own mtime, passed straight through. This file's whole pitch is
  // that it's the current one, and a date typed into the body would eventually
  // lie; this can't. ETag rides along so conditional requests work.
  const lastModified = res.headers.get("Last-Modified");
  const etag = res.headers.get("ETag");

  return new Response(res.body, {
    headers: {
      "Content-Type": wantsHtml
        ? "text/plain; charset=utf-8"
        : "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      // Two different bodies' worth of Content-Type come out of one URL above,
      // so shared caches have to key on Accept or they'll hand an agent the
      // variant meant for a browser.
      Vary: "Accept",
      ...(lastModified && { "Last-Modified": lastModified }),
      ...(etag && { ETag: etag }),
    },
  });
}
