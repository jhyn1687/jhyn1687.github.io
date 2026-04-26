import type { Bill } from "~/splitter/types";

export function canShareBill(bill: Bill): boolean {
  return (
    bill.title.trim() !== "" &&
    bill.participants.length > 0 &&
    bill.items.length > 0 &&
    bill.items.every((i) => i.splitBetween.length > 0)
  );
}
