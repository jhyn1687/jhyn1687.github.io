# Bill editing

Sub-items, negative amounts, bulk item actions, and the new-bill URL fix.

## Sub-items

A line item can have **child sub-items** — modifications, item-level discounts,
deposits/fees. `SubItem { id, name, price }` and `Item.children?: SubItem[]` in
[`types.ts`](../app/splitter/types.ts).

Design decisions:

- **One nesting level only.**
- A sub-item has **no `splitBetween`** — it inherits the parent's assignment,
  since whoever bought the burger bought what was done to it.
- **Zero-price modifications** ("no onions") are kept and shown, with a price
  field while editing, but the price is omitted from display once shared.
- **Item-level** adjustments are children; **order-level** discounts ("member
  savings") stay top-level negative items. Both are needed. Deposits/fees (CA
  redemption value, bottle deposits) are children too — a positive adjustment is
  the mirror of a discount and follows whoever bought the item.
- `children` is **optional on purpose**, so bills saved before sub-items existed
  — including immutable `bill_shares` snapshots still inside their 30-day window
  — keep loading with no migration.

`itemTotal()` in [`utils/bill.ts`](../app/splitter/utils/bill.ts) is the single
helper every price read goes through; it sums the base plus children, treating
`NaN` as 0.

## Negative amounts

Order-level discounts are negative top-level items. `BillSummary` apportions tax
by **positive spend**, not net subtotal — weighting by net inverted the split on
discounted bills. A negative per-person share is shown with a leading `−`.

## The sub-item button bug (fixed)

Adding a sub-item did nothing for a while: `ItemSection`'s `onItemChange`
adapter forwarded only `name`/`price`/`splitBetween`/`splitEvenly` and **dropped
`children`** before it reached the store. It now forwards the whole item, which
`updateItem` already merges. A reminder to forward whole objects rather than
hand-picking fields.

## Bulk actions — [`components/ItemSection.tsx`](../app/splitter/components/ItemSection.tsx)

Two buttons in the Items header, shown only when items exist and not in the
shared read-only view:

- **Split evenly** — flips every item to split among everyone at once.
- **Clear all** — removes all items, behind a [`ConfirmDialog`](../app/splitter/components/ConfirmDialog.tsx)
  (a reusable yes/no, styled to match `ReplaceScanDialog`).

Item delete was unified to an **X** icon matching the sub-item remove, keeping a
two-tap confirm (red-tinted on the first tap) since a top-level row carries
assignees and children.

## New-bill URL persistence (fixed)

**Symptom:** naming a new bill left the URL at `/splitter/new`, so the "New Bill"
link — pointing at that same URL — did nothing.

**Cause:** a race, not a missing navigation. `mutate()` in
[`SplitterShell.tsx`](../app/splitter/components/SplitterShell.tsx) _did_ call
`navigate('/splitter/:id')` on the first edit. But the save wrote to
localStorage **inside a `setLocalBills` updater**, which React runs on its own
schedule, while `navigate` fired on the next line. The `$billId` route's loader
read localStorage before the deferred write landed, found nothing, and its
`redirect('/splitter/new')` bounced straight back.

**Fix** — [`hooks/useBillsStore.ts`](../app/splitter/hooks/useBillsStore.ts): a
`localBillsRef` mirrors the list so `persistLocal` writes localStorage
**synchronously** in the same tick as the save, before navigation. The loader
now finds the bill and the URL sticks. Computing each change from the ref rather
than the setState updater is also correct under React batching, where several
saves in one tick would otherwise compose on stale state.

> This fires on the first _edit_ (title, participant, item, or scan) — not
> specifically on naming — since all of them go through `mutate`.
