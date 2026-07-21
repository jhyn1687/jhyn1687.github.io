# Receipt scanning

Turns an uploaded receipt (image or PDF) into bill line items via Cloudflare
Workers AI, with a client-side OCR fallback.

## Pipeline

1. **Normalize to JPEG, client-side** — [`utils/prepareReceipt.ts`](../app/splitter/utils/prepareReceipt.ts).
   Every upload is decoded to a canvas and re-encoded as JPEG, whatever it came
   in as. Cloudflare doesn't document which formats its vision models accept, so
   this avoids gambling, and it shrinks multi-megabyte phone photos. An
   already-in-range JPEG passes through untouched to avoid a second generation
   of loss.
2. **Send to the model** — [`routes/api.parse-receipt.ts`](../app/splitter/routes/api.parse-receipt.ts).
   The Worker calls Workers AI with the image and a structured-output schema.
3. **Parse the reply** — [`utils/receiptSchema.ts`](../app/splitter/utils/receiptSchema.ts).
   Validates and reshapes the model's JSON into the item structure.
4. **Fallback** — if the model is unavailable (EU region, quota, or an
   unusable reply) the client runs Tesseract locally and parses the text with
   [`utils/parseReceiptText.ts`](../app/splitter/utils/parseReceiptText.ts).

The client orchestration is in [`hooks/useReceiptOcr.ts`](../app/splitter/hooks/useReceiptOcr.ts).

## Formats

**JPG, PNG, WebP, PDF. HEIC is deliberately excluded** — browsers outside Safari
often can't decode it, and leaving it out of `accept` makes iOS transcode to
JPEG on the way out.

**PDFs are rasterized client-side** with pdfjs, since Workers has no canvas.
Capped at 3 pages, stitched vertically into one image because Llama-family
vision models are trained for one image per request. Width is prioritized over
height when scaling so dense multi-column receipts stay legible.

> pdfjs + Vite gotcha: the worker must be wired as
> `new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), { type: "module" })`
> and assigned to `GlobalWorkerOptions.workerPort`. A plain `workerSrc` string
> gets Vite's `injectQuery` shim injected, which touches `document` and hangs
> the worker silently.

## The model

**`@cf/mistralai/mistral-small-3.1-24b-instruct`**, pulled out as a `MODEL`
constant. Swapped up from `llama-3.2-11b-vision-instruct`, which misread dense
multi-column receipts — on a Costco scan it paired item names with prices from
the adjacent row. The larger model fixed that alignment.

- Cloudflare's docs class this model as text-only, but the binding **types**
  (`@cloudflare/workers-types`) declare the same `messages[].content[].image_url`
  shape as the vision models, and it works. **Trust the types over the docs.** A
  fake model id fails `pnpm typecheck` because `AI.run` is typed as
  `keyof AiModels`, so typecheck doubles as a "does this model exist" check.
- Roughly ~100 neurons per scan (~2,600 in / ~400 out tokens); the free tier is
  10,000 neurons/day, so ~95 scans/day.
- `temperature: 0`. Transcription is not creative writing; sampling made the
  same receipt return different answers run to run, which made prompt changes
  impossible to evaluate.

## Structured output

Output is requested via **`guided_json`** (a JSON schema passed alongside
`messages`) rather than parsed from indented text. The old approach asked the
model to indent sub-items by two spaces; to express "this discount belongs to
that item" it had to invent a layout, and dropped the line when unsure. A nested
`adjustments` field says the same thing structurally.

Two hard-won details about `guided_json` on this model:

- **Enforcement depends on the message role.** With the instructions in the
  _user_ turn, the model ignored the schema — it returned a ` ```json `
  fence, invented top-level objects (`storeInfo`, `transactionInfo`), and a
  per-item `taxable` field. Moving the contract to a **`system`** message, plus
  a worked JSON example in the prompt, got the schema honoured.
- **When enforced, `AI.run().response` is an already-parsed object**, not the
  JSON string it returns when the schema is ignored. The route handles both
  shapes (stringifies an object so one downstream reader covers both).

The prompt itself leads with a concrete worked example of the exact output
(including one nested adjustment) and forbids any field or fence not shown — a
model that pattern-matches "receipt as JSON" responds to an example far better
than to prose rules.

## Parsing and defensive recovery

[`receiptSchema.ts`](../app/splitter/utils/receiptSchema.ts):

- **`recoverJson()`** pulls the JSON object out of a reply and repairs two
  failure modes: a markdown fence or prose preamble (scan from the first `{`),
  and a `max_tokens` truncation (close the brackets back to the last completed
  value, so a 40-line receipt isn't lost over its last row). `max_tokens` is
  4096 — a long warehouse receipt runs past 2048, and a cut lands on the tax and
  tip the schema emits after the items.
- **`fromSchema()`** validates: coerces string amounts, rejects blanks and
  absurd values (`|n| >= 10000`), and reads `price` **or** `amount` for every
  value because the model uses whichever it likes regardless of the schema.
  It reads a flat top-level `adjustments` array as well as `orderDiscounts`,
  for the same reason.

> **Never let the text parser see a structured reply.** The first `guided_json`
> scan produced a bill of nonsense — items literally named `"price":` — because
> `JSON.parse` failed and the code fell back to `parseReceiptText`, whose
> `NAME  12.34` pattern happily matches a pretty-printed `  "price": -3.00`. A
> fallback that silently accepts the wrong input is worse than none. The route
> now returns empty items (routing the client to local OCR) rather than text-
> parsing anything that contains a `{`.

## The Tesseract-path parser

[`parseReceiptText.ts`](../app/splitter/utils/parseReceiptText.ts) still backs
the local OCR path. Real-receipt quirks it handles, all discovered from actual
Costco scans:

- **Trailing-minus amounts** (`2.00-`) — Costco prints discounts with the sign
  after the number; only the leading form used to match.
- **Word-boundaried skip words** — unanchored, "change" ate EXCHANGE, "cash" ate
  CASHEWS, "due" ate FONDUE. Tender/summary lines are skipped, but with `\b`.
- **`TAX` vs `TOTAL TAX`** — often both printed for the same money; using both
  doubles it, ignoring both loses it. Charges and restatements are collected
  separately and the charge wins.
- **Positive savings tallies** — "INSTANT SAVINGS $6.50" is printed without a
  sign, so taken literally it _adds_ money. A real discount arrives negative;
  the sign distinguishes a tally from a discount.
- **Quantity lines** ("2 @ 3.99") print _above_ their item, and the item's own
  row already carries the extended total — so they're context to skip.

## Rate limiting & licensing

- Per-IP OCR cap (10/month) enforced by `check_and_increment_ocr`
  (`supabase/migrations/20260426*_ocr_rate_limit*.sql`). The global cap was
  dropped; only the per-IP limit remains.
- The route returns 451 for EU-domiciled IPs (Llama license restriction),
  which routes the client to the local fallback.

## Known accuracy ceiling

Transcription errors persist at the free-model tier — e.g. a dropped digit
(`SPRITE 23.89` read as `2.89`), which is a ~$21 error that looks entirely
plausible in the UI. This is exactly what showing the receipt image beside the
bill is for (see [receipt-preview.md](receipt-preview.md)). A schema constrains
shape, not accuracy.
