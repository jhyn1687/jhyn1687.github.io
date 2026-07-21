# Splitter docs

Reference for the bill-splitter sub-app (`/splitter`) — receipt scanning,
preview, sharing, and cleanup. These describe how things work and — more
importantly — **why**, since the reasoning is the part that isn't obvious from
the code.

| Doc                                        | What it covers                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| [receipt-scanning.md](receipt-scanning.md) | Scanning a receipt into line items: format normalization, the vision model, structured output, and the parsing/fallback chain |
| [receipt-preview.md](receipt-preview.md)   | Storing the scanned image and showing it beside the bill — local and shared — with whitespace trim and in-place zoom          |
| [bill-editing.md](bill-editing.md)         | Sub-items, negative amounts, bulk item actions, and the new-bill URL persistence fix                                          |
| [receipt-sharing.md](receipt-sharing.md)   | Opt-in receipt sharing via Supabase Storage, the serving proxy, and the scheduled purge of expired data                       |
| [supabase-setup.md](supabase-setup.md)     | Operational runbook: which migrations to apply, secrets to set, and functions to deploy                                       |

## The stack these assume

React Router v7 (SSR) on Cloudflare Workers, Supabase (Postgres + Storage),
Cloudflare Workers AI for OCR. All content lives in the bill JSON — there are no
separate content tables. See the root `CLAUDE.md` and `app/splitter/AGENTS.md`
for the wider architecture.
