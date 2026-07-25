import type { Route } from "./+types/llms.txt";

// The llms.txt convention: a short index at a well-known path that points
// crawlers at the real plain-text content. Deliberately generated here rather
// than stored in the `files` bucket like AGENTS.md — this file is a directory
// of routes, not prose, so it should change when routes.ts changes, not on its
// own. AGENTS.md remains the one that's editable without a redeploy.
export function loader({ request }: Route.LoaderArgs) {
  // Derived rather than hardcoded so the links stay correct on preview
  // deployments and under `wrangler dev`, not just on jhyn.dev.
  const { origin } = new URL(request.url);

  const body = `# jhyn.dev

> personal site of tony yuan, a software engineer at block. server-rendered,
> so every page's full text is already in its html.

## start here

- [${origin}/AGENTS.md](${origin}/AGENTS.md): the full plain-text briefing — who i am, what's on the site, and how i'd rather you crawl it

## pages

- [${origin}/](${origin}/): portfolio — bio, experience, projects
- [${origin}/splitter](${origin}/splitter): splitter, a bill splitting app with receipt scanning
- [${origin}/files/resume.pdf](${origin}/files/resume.pdf): resume, as a pdf

## contact

- tony@jhyn.dev
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
