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

## Sub-item propagation

`ItemSection`'s `onItemChange` forwards the **whole** updated item to the store,
which `updateItem` merges. This matters: an adapter that forwards only a
hand-picked subset (`name`/`price`/`splitBetween`/`splitEvenly`) silently drops
`children`, so added sub-items never persist and the button appears dead.
Forward whole objects rather than enumerating fields.

## Bulk actions — [`components/ItemSection.tsx`](../app/splitter/components/ItemSection.tsx)

Two buttons in the Items header, shown only when items exist and not in the
shared read-only view:

- **Split evenly** — flips every item to split among everyone at once.
- **Clear all** — removes all items, behind a [`ConfirmDialog`](../app/splitter/components/ConfirmDialog.tsx)
  (a reusable yes/no, styled to match `ReplaceScanDialog`).

Item delete uses an **X** icon matching the sub-item remove, with a two-tap
confirm (red-tinted on the first tap) since a top-level row carries assignees
and children.

## New-bill URL persistence

On the first edit of a new bill, the URL switches from `/splitter/new` to
`/splitter/:id` and the draft persists — so the "New Bill" link (pointing at
`/splitter/new`) is then a real navigation rather than a no-op.

This is timing-sensitive. `mutate()` in
[`SplitterShell.tsx`](../app/splitter/components/SplitterShell.tsx) navigates to
`/splitter/:id` immediately after saving, and the `$billId` route's loader reads
localStorage on arrival, redirecting back to `/new` if it finds nothing. So the
save **must be synchronous** — [`hooks/useBillsStore.ts`](../app/splitter/hooks/useBillsStore.ts)
keeps a `localBillsRef` mirror and `persistLocal` writes localStorage in the
same tick as the save, before navigation, rather than inside a `setLocalBills`
updater React runs on its own schedule. Computing each change from the ref is
also correct under React batching, where several saves in one tick would
otherwise compose on stale state.

> This fires on the first _edit_ (title, participant, item, or scan) — not
> specifically on naming — since all of them go through `mutate`.
