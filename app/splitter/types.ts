export type PersonColor = { bg: string; fg: string };

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
