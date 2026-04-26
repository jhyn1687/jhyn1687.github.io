# jhyn.dev — AI Agent Context

Personal portfolio site for Tony Yuan, serving two distinct apps from the same Cloudflare Pages deployment.

## Repo structure

```
app/
├── portfolio/      # Portfolio site (/)
├── splitter/       # Bill splitter app (/splitter/*)
├── utils/          # Shared server utilities (Supabase client)
├── root.tsx        # HTML shell, global theming, error boundary
├── app.css         # Tailwind v4 imports + global styles
└── routes.ts       # React Router v7 route config
workers/app.ts      # Cloudflare Worker entry — injects cloudflare env/ctx into load context
```

See [app/portfolio/AGENTS.md](app/portfolio/AGENTS.md) and [app/splitter/AGENTS.md](app/splitter/AGENTS.md) for subsystem detail.

## Stack

- **Framework**: React Router v7 (SSR, Vite-based)
- **Styling**: Tailwind CSS v4 + Catppuccin Mocha theme (`@catppuccin/tailwindcss`)
- **Backend**: Supabase (PostgreSQL + Storage), accessed server-side only
- **Deployment**: Cloudflare Pages + Workers
- **Package manager**: pnpm

## Non-obvious constraints

**Cloudflare env vars** — `SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected by the Worker (`workers/app.ts`) into the React Router load context as `context.cloudflare.env`. They are never in `process.env` and never exposed to the client bundle. Access them only inside `loader`/`action` functions.

**Cloudflare Vite plugin** — Uses `@cloudflare/vite-plugin` with `v8_viteEnvironmentApi: true`. Do **not** use `cloudflareDevProxy()` from `@react-router/dev/vite/cloudflare` — it conflicts.

**SSR + client-only code** — Splitter routes use `clientLoader` (runs in the browser). Portfolio routes use `loader` (runs on the server). Never call `localStorage` or `window` inside a server `loader`.

**Imports** — Always use `~/...` absolute imports (e.g. `~/splitter/types`). Never use `../` relative imports.

**Theming** — All Tailwind color utilities use the `ctp-` prefix (e.g. `text-ctp-text`, `bg-ctp-surface0`). The `class="mocha"` on `<html>` activates the palette via CSS custom properties.

## Commands

```sh
pnpm dev          # Dev server with Cloudflare Workers proxy
pnpm build        # Production build
pnpm typecheck    # Regenerate .react-router/types/ + tsc
pnpm deploy       # Build + deploy to Cloudflare Pages (preview URL)
```
