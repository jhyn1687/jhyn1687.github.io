# Splitter — AI Agent Context

The splitter is a client-heavy bill-splitting app served at `/splitter/*`. It requires no login — all local state lives in `localStorage`, with optional Supabase-backed sharing.

## Data model

```typescript
Bill       = { title, participants: Participant[], items: Item[], tax, tip }
Participant = { id, name, color: { bg, fg } }  // color is OKLCH pair from palette
Item       = { id, name, price, splitBetween: string[] }  // splitBetween = participant IDs

LocalBill  = { id, bill, updatedAt, shareCode?, shareUrl? }  // stored in localStorage
SharedBill = { shareCode, shareUrl, bill, cachedAt, expiresAt }  // cached in localStorage
```

## localStorage keys

| Key                     | Contents                                                       |
| ----------------------- | -------------------------------------------------------------- |
| `splitter_local_bills`  | `LocalBill[]` — bills created by the user                      |
| `splitter_shared_bills` | `SharedBill[]` — shared bills fetched from API, cached 30 days |
| `splitter_settings`     | `SplitterSettings` — `{ skipShareDialog: boolean }`            |

`useBillsStore` (`hooks/useBillsStore.ts`) is the single point of access for all localStorage reads/writes. It also handles legacy key migration from older formats.

## State management

`useBillsStore` is a plain React hook (no Zustand/Redux). It initializes from localStorage on mount and syncs writes back on every mutation. `SplitterShell` is the root component for all bill views — it holds bill state and delegates to child components via callbacks.

## Share flow

1. User clicks Share in `AppHeader`
2. `SplitterShell.handleShare()` validates the bill (title, participants, items, all assigned)
3. If already shared: copies existing URL to clipboard
4. If `skipShareDialog`: calls `confirmShare` directly
5. Otherwise: opens `ShareDialog`
6. `confirmShare` → `POST /api/share-bill` → Supabase `bill_shares` table → returns `{ url, code }`
7. `LocalBill.shareCode` and `shareUrl` are set so future shares just copy the URL

## API routes

All API routes are in `routes/`. They run server-side on Cloudflare Workers.

| Route                     | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `POST /api/share-bill`    | Stores bill JSON in `bill_shares` table, returns short code |
| `GET /api/bill/:code`     | Fetches bill JSON by code                                   |
| `POST /api/parse-receipt` | Google Cloud Vision OCR + Tesseract.js fallback             |

**OCR rate limits** (enforced via Supabase RPC `check_and_increment_ocr`): 10 requests/month per IP, 900/month global. Returns 429 on quota; client falls back to Tesseract.js.

## Participant colors

`utils/colors.ts` holds 8 OKLCH color pairs. `colorForIndex(n)` cycles through the palette. `nextColorSeed(participants)` finds the highest index in use so re-adding participants after removal never collides with existing colors.

## Key files

| File                              | Role                                                             |
| --------------------------------- | ---------------------------------------------------------------- |
| `components/SplitterShell.tsx`    | Root component: all bill state + mutations                       |
| `hooks/useBillsStore.ts`          | localStorage read/write + share flow + toast                     |
| `types.ts`                        | All shared types                                                 |
| `utils/colors.ts`                 | Participant color palette                                        |
| `utils/parseReceiptText.ts`       | Text → `OcrItem[]` parser (used by both GCV and Tesseract paths) |
| `routes/splitter.tsx`             | Index: redirects to latest bill or `/splitter/new`               |
| `routes/splitter.$billId.tsx`     | Edit a local bill (clientLoader reads from localStorage)         |
| `routes/splitter.share.$code.tsx` | View a shared bill (clientLoader fetches from API, caches)       |
