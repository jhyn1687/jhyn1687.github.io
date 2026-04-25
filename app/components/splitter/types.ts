export type Participant = {
  id: string;
  name: string;
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
};
