export type PersonColor = {
  chip: string; // border + bg + text — for participant chips
  avatar: string; // bg + text — for avatar circles
  text: string; // text only — for amounts and totals
  button: string; // bg + text — for the remove button
};

export type Participant = {
  id: string;
  name: string;
  color: PersonColor;
};

/**
 * A modification or discount attached to an item — extra bacon, instant
 * savings, no onions. Deliberately has no splitBetween: it always follows the
 * parent's assignment, since whoever bought the burger bought what was done to
 * it. A zero price is meaningful and kept; it records whose item it is.
 */
export type SubItem = {
  id: string;
  name: string;
  price: number;
};

export type Item = {
  id: string;
  name: string;
  price: number;
  splitBetween: string[]; // participant IDs
  splitEvenly?: boolean; // always split among all participants
  /**
   * Optional so bills saved before sub-items existed — including immutable
   * bill_shares snapshots still inside their 30-day window — keep loading.
   */
  children?: SubItem[];
};

export type Bill = {
  title: string;
  participants: Participant[];
  items: Item[];
  tax: number;
  tip: number;
};

// Editable bill stored locally — created by the user
export type LocalBill = {
  id: string;
  bill: Bill;
  updatedAt: number;
  shareCode?: string; // set once shared; prevents re-generating links
  shareUrl?: string;
};

// Read-only bill received via a share link — stored with expiry
export type SharedBill = {
  shareCode: string;
  shareUrl: string;
  bill: Bill;
  cachedAt: number;
  expiresAt: number;
  /**
   * The sharer opted to include the scanned receipt. Only a flag — the image
   * itself is streamed on demand from /api/bill/:code/receipt, never cached in
   * localStorage alongside the bill.
   */
  hasReceipt?: boolean;
};

export type SplitterSettings = {
  skipShareDialog: boolean;
};
