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
```

## Environment Variables

Set in Cloudflare Pages dashboard (not committed to repo):

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anonymous/public key

These are accessed server-side only (in loaders via `supabase.server.ts`), never exposed to the client bundle.
