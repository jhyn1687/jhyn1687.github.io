# CLAUDE.md

## Project Overview

Personal portfolio website for Tony Yuan (https://jhyn.dev/).

## Tech Stack

- **Framework**: React Router v7 (Vite-based, SSR)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Backend/Database**: Supabase (PostgreSQL + Storage)
- **Deployment**: Cloudflare Pages
- **Package Manager**: pnpm

## Architecture: Server-Driven UI (SDUI)

Section-level SDUI pattern:

- A `sections` table in Supabase defines page layout
- A **component registry** (`app/components/registry.ts`) maps section `type` strings to React components
- The route **loader** fetches sections server-side and passes them to the page
- Sections can be reordered, hidden, or added from Supabase without redeploying
- All content (experiences, projects, quotes, etc.) is embedded in `sections.props.children` — no separate content tables. This keeps fetching simple (single query) and aligns with the SDUI philosophy of the server defining everything.

### Supabase Schema

**`sections`** table:
| Column | Type | Description |
|----------|---------|----------------------------------------------------------|
| id | int | Primary key |
| type | text | Component type (e.g., "hero", "experience_list") |
| props | jsonb | Section properties + children array for nested content |
| order | int | Display order on the page |
| visible | boolean | Whether the section is rendered |

**Storage buckets**: `images` (project images), `files` (resume PDF, etc.)

## Project Structure

```
app/
├── components/
│   ├── registry.ts          # Maps section type → React component
│   ├── sections/            # SDUI section components
│   └── ui/                  # Shared component library
├── utils/
│   └── supabase.server.ts   # Supabase client (server-side only)
├── routes/
│   └── home.tsx             # Loader fetches sections, renders via registry
├── app.css                  # Tailwind imports + global styles
└── root.tsx                 # HTML shell, meta, links, error boundary
workers/
└── app.ts                   # Cloudflare Worker entry point (injects cloudflare env/ctx into load context)
public/
├── favicon.ico
├── logo.svg
└── signature.svg
```

## Commands

```sh
pnpm dev          # Start dev server (with Cloudflare Workers local proxy)
pnpm build        # Production build
pnpm preview      # Build + preview with wrangler
pnpm deploy       # Build + deploy to Cloudflare Pages
pnpm typecheck    # Generate route types + run tsc
pnpm test         # Run the Vitest unit suite once
pnpm test:watch   # Run Vitest in watch mode
```

Unit tests (Vitest, jsdom) live beside the code as `*.test.ts` and cover the pure logic in `app/splitter/utils/` and the section registry. Config is `vitest.config.ts`, kept separate from `vite.config.ts` so tests don't boot the Cloudflare/SSR environment.

`pnpm deploy` (wrangler) deploys to a **preview** URL. Production deployments go through CI/CD triggered by pushing to `main`.

## Cloudflare Integration

Uses `@cloudflare/vite-plugin` (the newer Vite Environment API approach) with `v8_viteEnvironmentApi: true` in `react-router.config.ts`. **Do not use `cloudflareDevProxy()`** from `@react-router/dev/vite/cloudflare` — it conflicts with this plugin. The Worker entry is `workers/app.ts`, which injects `{ cloudflare: { env, ctx } }` into the React Router load context.

### Managed robots.txt

**The Managed robots.txt rule must stay OFF on this zone**, and the served output is the only way to confirm it. Both states have been observed in production:

- **Off (current, intended).** The managed content is a fallback, not a merge — served only when the origin has none. `public/robots.txt` replaces it outright, and the content-signals preamble disappears entirely.
- **On.** [The docs](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/) are accurate here: the preamble and a managed block are prepended above our directives, combined into one response.

Enabling it inverts the crawl policy with no change in this repo, in two ways:

- It emits `Disallow: /` for eight named AI crawlers (ClaudeBot, GPTBot, CCBot, Google-Extended, Applebot-Extended, Bytespider, Amazonbot, meta-externalagent). Under [RFC 9309 §2.2.1](https://www.rfc-editor.org/rfc/rfc9309.html#section-2.2.1) a crawler obeys only the **most specific** matching `User-agent` group, so those crawlers read their own block and never consult our `User-agent: *` group at all. `Allow: /` cannot override it, and neither can ordering. `/AGENTS.md` becomes unreachable to exactly the agents it was written for.
- It emits its own `Content-Signal` (`search=yes,ai-train=no,use=reference`), leaving two `User-agent: *` groups with conflicting signals in one file. The convention doesn't define which wins, so the published policy becomes genuinely ambiguous rather than merely overridden.

If crawlers stop honoring `/AGENTS.md`, check this setting before debugging the file.

The content-signals preamble at the top of `public/robots.txt` is Cloudflare's, copied verbatim from the served output while the rule was briefly on. With the rule off nothing supplies it for us, and the EU Article 4 reservation of rights lives only there — which now matters, because `ai-train=no` is a restriction for that language to attach to. **Keep the preamble as long as any signal is `no`, and don't reword it**; it is boilerplate whose value is in being the standard text.

The signal set is deliberately mixed, not uniformly open or closed:

- `ai-train=no` is the only one of the four that doesn't affect agents reading the site. An agent fetching a page to answer someone's question is `ai-input`; `ai-train` covers corpus collection for training runs, which returns neither traffic nor attribution. Declining it costs no readers.
- `use=full` ("summarize and reproduce") is set because `/AGENTS.md` is a summarization brief — it pre-approves a specific one-line description of Tony and assumes summarizing is inevitable. `use=reference` ("index, excerpt, and link back") would tell agents not to do the thing that file then coaches them through. **If the prose in the bucket changes, re-check this pairing.** Note `use` is an [optional extension](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/) rather than one of the three original signals.

One side effect: if the rule is ever re-enabled, the preamble will appear twice. Harmless (comments only), and a useful tell.

Always verify the served output after deploying, not just `public/robots.txt`. Two directive groups, or any `User-agent` other than `*`, means the rule got switched back on:

```sh
curl -s https://jhyn.dev/robots.txt | grep -vE "^\s*#" | grep -v "^$"
```

## Theming

Catppuccin Mocha via `@catppuccin/tailwindcss`. The `class="mocha"` on `<html>` (in `root.tsx`) activates the Mocha palette by setting `--catppuccin-color-*` CSS custom properties that cascade to the whole page. All Tailwind color utilities use the `ctp-` prefix (e.g., `text-ctp-text`, `bg-ctp-surface0/40`, `border-ctp-surface1/50`). `@catppuccin/palette` is also imported directly in `RippleBackground.tsx` for JavaScript-side RGB values used in the canvas color table.

## Environment Variables

Set in Cloudflare Pages dashboard (not committed to repo):

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anonymous/public key

These are accessed server-side only (in loaders via `supabase.server.ts`), never exposed to the client bundle.
