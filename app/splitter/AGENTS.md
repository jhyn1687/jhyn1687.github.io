# Splitter — AI Agent Context

The splitter is a client-heavy bill-splitting app served at `/splitter/*`. It requires no login — all local state lives in `localStorage`, with optional Supabase-backed sharing.

## Data model

```typescript
Bill        = { title, participants: Participant[], items: Item[], tax, tip }
Participant = { id, name, color: PersonColor }
PersonColor = { chip, avatar, text, button }  // Tailwind class strings from Catppuccin palette
Item        = { id, name, price, splitBetween: string[], splitEvenly?: boolean }
             // splitBetween = participant IDs; splitEvenly = always split among all participants

LocalBill   = { id, bill, updatedAt, shareCode?, shareUrl? }  // stored in localStorage
SharedBill  = { shareCode, shareUrl, bill, cachedAt, expiresAt }  // cached in localStorage, 30-day TTL
```

## localStorage keys

| Key                     | Contents                                                       |
| ----------------------- | -------------------------------------------------------------- |
| `splitter_local_bills`  | `LocalBill[]` — bills created by the user                      |
| `splitter_shared_bills` | `SharedBill[]` — shared bills fetched from API, cached 30 days |
| `splitter_settings`     | `SplitterSettings` — `{ skipShareDialog: boolean }`            |

`useBillsStore` (`hooks/useBillsStore.ts`) is the single point of access for all localStorage reads/writes. It also handles legacy key migration from older formats (`splitter_bills`, `splitter_bill_draft`).

## State management

`useBillsStore` is a plain React hook (no Zustand/Redux). It initializes from localStorage on mount and syncs writes back on every mutation. `SplitterShell` is the root component for all bill views — it holds bill state and delegates to child components via callbacks.

## Share flow

1. User clicks Share in `AppHeader`
2. `SplitterShell.handleShare()` validates the bill via `canShareBill()` (requires: non-empty title, ≥1 participant, ≥1 item, all items have `splitBetween` assigned)
3. If already shared: copies existing URL to clipboard
4. If `skipShareDialog` is true: calls `confirmShare` directly
5. Otherwise: opens `ShareDialog` modal
6. `confirmShare` → `POST /api/share-bill` → Supabase `bill_shares` table → returns `{ url, code }`
7. Shared bill is cached in `splitter_shared_bills`; local bill is deleted; user navigates to the read-only shared view

## API routes

All API routes are in `routes/`. They run server-side on Cloudflare Workers.

| Route                     | Purpose                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `POST /api/share-bill`    | Stores bill JSON in `bill_shares` table, returns 6-char code     |
| `GET /api/bill/:code`     | Fetches bill JSON by code                                        |
| `POST /api/parse-receipt` | Cloudflare AI (Llama 3.2 11B Vision) OCR + Tesseract.js fallback |

**OCR rate limits** (enforced via Supabase RPC `check_and_increment_ocr`): 10 requests/month per IP, 900/month global. Returns 429 on quota; client falls back to Tesseract.js.

**EU regional blocking**: Returns 451 (Unavailable For Legal Reasons) for EU countries due to Llama 3.2 licensing; client falls back to Tesseract.js.

## Participant colors

`utils/colors.ts` holds a 7-color Catppuccin palette. Each entry is a `PersonColor` with four Tailwind class strings (`chip`, `avatar`, `text`, `button`). `colorForIndex(n)` cycles through the palette. `nextColorSeed(participants)` finds the highest index in use so re-adding participants after removal never collides with existing colors.

## Key files

| File                              | Role                                                               |
| --------------------------------- | ------------------------------------------------------------------ |
| `types.ts`                        | All shared types                                                   |
| `components/SplitterShell.tsx`    | Root component: all bill state + mutations                         |
| `components/BillSummary.tsx`      | Per-person breakdown (tax/tip split proportionally by subtotal)    |
| `hooks/useBillsStore.ts`          | localStorage read/write + share flow + toast                       |
| `hooks/useReceiptOcr.ts`          | Receipt upload orchestration (server AI → Tesseract fallback)      |
| `utils/bill.ts`                   | `canShareBill()` validation                                        |
| `utils/colors.ts`                 | Participant color palette                                          |
| `utils/parseReceiptText.ts`       | Text → `OcrItem[]` parser (used by both Llama and Tesseract paths) |
| `routes/splitter.layout.tsx`      | Root layout: sidebar, toast system, `SplitterLayoutContext`        |
| `routes/splitter.tsx`             | Dashboard: lists local drafts and shared bills                     |
| `routes/splitter.new.tsx`         | New bill (generates UUID + redirects to `/$billId` on first edit)  |
| `routes/splitter.$billId.tsx`     | Edit a local bill (clientLoader reads from localStorage)           |
| `routes/splitter.share.$code.tsx` | View a shared bill (clientLoader fetches from API, caches 30d)     |

## URL conventions

- `/splitter/new?scan=1` — opens the receipt scan modal immediately on load
- `/splitter/:billId` — edit a local bill
- `/splitter/share/:code` — read-only view of a shared bill; shows "Fork" button to copy into a new local bill
