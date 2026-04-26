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

export type SavedBill = {
  id: string;
  bill: Bill;
  updatedAt: number;
  shareCode?: string;
  shareUrl?: string;
  isShared: boolean;
};

export type SplitterSettings = {
  skipShareDialog: boolean;
};
