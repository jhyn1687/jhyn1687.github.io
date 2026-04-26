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

export type Item = {
  id: string;
  name: string;
  price: number;
  splitBetween: string[]; // participant IDs
  splitEvenly?: boolean; // always split among all participants
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
};

export type SplitterSettings = {
  skipShareDialog: boolean;
};
