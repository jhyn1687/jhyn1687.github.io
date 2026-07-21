import { describe, expect, it } from "vitest";
import {
  canShareBill,
  computeBreakdowns,
  itemTotal,
} from "~/splitter/utils/bill";
import type { Bill, Item, Participant } from "~/splitter/types";

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: "i1",
    name: "Burger",
    price: 10,
    splitBetween: ["p1"],
    ...overrides,
  };
}

function person(id: string, name = id): Participant {
  return { id, name, color: {} as never };
}

function bill(overrides: Partial<Bill> = {}): Bill {
  return {
    title: "Dinner",
    participants: [{ id: "p1", name: "Ana", color: {} as never }],
    items: [item()],
    tax: 0,
    tip: 0,
    ...overrides,
  };
}

describe("itemTotal", () => {
  it("returns the item's own price when it has no children", () => {
    expect(itemTotal(item({ price: 12.5 }))).toBe(12.5);
  });

  it("adds every child's price to the base", () => {
    const withChildren = item({
      price: 10,
      children: [
        { id: "c1", name: "Extra bacon", price: 2 },
        { id: "c2", name: "Instant savings", price: -3 },
      ],
    });
    expect(itemTotal(withChildren)).toBe(9);
  });

  it("treats a blank (NaN) price as zero rather than poisoning the sum", () => {
    expect(itemTotal(item({ price: NaN }))).toBe(0);
    expect(
      itemTotal(
        item({
          price: 5,
          children: [{ id: "c1", name: "mod", price: NaN }],
        }),
      ),
    ).toBe(5);
  });

  it("keeps zero-price children (a free modification) without changing the total", () => {
    const withFreeMod = item({
      price: 8,
      children: [{ id: "c1", name: "No onions", price: 0 }],
    });
    expect(itemTotal(withFreeMod)).toBe(8);
  });

  it("handles an explicitly empty children array", () => {
    expect(itemTotal(item({ price: 7, children: [] }))).toBe(7);
  });
});

describe("canShareBill", () => {
  it("accepts a fully specified bill", () => {
    expect(canShareBill(bill())).toBe(true);
  });

  it("rejects a bill with a blank or whitespace-only title", () => {
    expect(canShareBill(bill({ title: "" }))).toBe(false);
    expect(canShareBill(bill({ title: "   " }))).toBe(false);
  });

  it("rejects a bill with no participants", () => {
    expect(canShareBill(bill({ participants: [] }))).toBe(false);
  });

  it("rejects a bill with no items", () => {
    expect(canShareBill(bill({ items: [] }))).toBe(false);
  });

  it("rejects when any item has nobody assigned to split it", () => {
    expect(
      canShareBill(
        bill({
          items: [item(), item({ id: "i2", splitBetween: [] })],
        }),
      ),
    ).toBe(false);
  });
});

describe("computeBreakdowns", () => {
  const ana = person("p1", "Ana");
  const ben = person("p2", "Ben");

  function totalFor(bd: ReturnType<typeof computeBreakdowns>, id: string) {
    return bd.breakdowns.find((b) => b.participant.id === id)!.total;
  }

  it("gives a single person the whole bill", () => {
    const result = computeBreakdowns(
      [item({ price: 10, splitBetween: ["p1"] })],
      [ana],
      2,
      1,
    );
    expect(result.subtotal).toBe(10);
    expect(result.grandTotal).toBe(13);
    expect(result.breakdowns[0].total).toBe(13);
  });

  it("splits a shared item evenly between its assignees", () => {
    const result = computeBreakdowns(
      [item({ price: 10, splitBetween: ["p1", "p2"] })],
      [ana, ben],
      0,
      0,
    );
    expect(totalFor(result, "p1")).toBe(5);
    expect(totalFor(result, "p2")).toBe(5);
  });

  it("apportions tax and tip by each person's positive spend", () => {
    // Ana buys $30, Ben buys $10 → tax/tip split 75/25.
    const result = computeBreakdowns(
      [
        item({ id: "i1", price: 30, splitBetween: ["p1"] }),
        item({ id: "i2", price: 10, splitBetween: ["p2"] }),
      ],
      [ana, ben],
      8,
      4,
    );
    const a = result.breakdowns.find((b) => b.participant.id === "p1")!;
    const b = result.breakdowns.find((b) => b.participant.id === "p2")!;
    expect(a.taxShare).toBeCloseTo(6);
    expect(a.tipShare).toBeCloseTo(3);
    expect(a.total).toBeCloseTo(39);
    expect(b.taxShare).toBeCloseTo(2);
    expect(b.tipShare).toBeCloseTo(1);
    expect(b.total).toBeCloseTo(13);
    // The apportioned tax and tip add back up to the amounts charged.
    expect(a.taxShare + b.taxShare).toBeCloseTo(8);
    expect(a.tipShare + b.tipShare).toBeCloseTo(4);
  });

  it("falls back to an even tax/tip split when no positive charge exists", () => {
    // Only a discount line, so there is no positive spend to weight by.
    const result = computeBreakdowns(
      [item({ price: -10, splitBetween: ["p1", "p2"] })],
      [ana, ben],
      6,
      0,
    );
    expect(result.breakdowns[0].taxShare).toBeCloseTo(3);
    expect(result.breakdowns[1].taxShare).toBeCloseTo(3);
  });

  it("does not hand a discounted-only buyer a negative tax share", () => {
    // Ana nets -5 (discount), Ben buys 20. Weighting by net would invert Ana's
    // share; weighting by positive spend keeps all the tax on Ben.
    const result = computeBreakdowns(
      [
        item({ id: "i1", price: -5, splitBetween: ["p1"] }),
        item({ id: "i2", price: 20, splitBetween: ["p2"] }),
      ],
      [ana, ben],
      4,
      0,
    );
    const a = result.breakdowns.find((b) => b.participant.id === "p1")!;
    const b = result.breakdowns.find((b) => b.participant.id === "p2")!;
    expect(a.taxShare).toBe(0);
    expect(b.taxShare).toBeCloseTo(4);
    expect(a.itemsTotal).toBe(-5);
  });

  it("includes sub-items in both the total and the per-person breakdown", () => {
    const result = computeBreakdowns(
      [
        item({
          price: 10,
          splitBetween: ["p1", "p2"],
          children: [{ id: "c1", name: "Extra bacon", price: 4 }],
        }),
      ],
      [ana, ben],
      0,
      0,
    );
    expect(result.subtotal).toBe(14);
    expect(totalFor(result, "p1")).toBe(7);
    const line = result.breakdowns[0].myItems[0];
    expect(line.amount).toBe(7); // (10 + 4) / 2
    expect(line.children).toEqual([{ name: "Extra bacon", amount: 2 }]);
  });

  it("treats a blank (NaN) sub-item price as zero in the breakdown line", () => {
    const result = computeBreakdowns(
      [
        item({
          price: 10,
          splitBetween: ["p1"],
          children: [{ id: "c1", name: "mod", price: NaN }],
        }),
      ],
      [ana],
      0,
      0,
    );
    expect(result.breakdowns[0].myItems[0].children).toEqual([
      { name: "mod", amount: 0 },
    ]);
  });

  it("lists only the items a person is assigned to", () => {
    const result = computeBreakdowns(
      [
        item({
          id: "i1",
          name: "Shared",
          price: 10,
          splitBetween: ["p1", "p2"],
        }),
        item({ id: "i2", name: "Ben only", price: 6, splitBetween: ["p2"] }),
      ],
      [ana, ben],
      0,
      0,
    );
    const a = result.breakdowns.find((b) => b.participant.id === "p1")!;
    const b = result.breakdowns.find((b) => b.participant.id === "p2")!;
    expect(a.myItems.map((i) => i.name)).toEqual(["Shared"]);
    expect(b.myItems.map((i) => i.name)).toEqual(["Shared", "Ben only"]);
  });

  it("counts an unassigned item in the subtotal but charges it to nobody", () => {
    const result = computeBreakdowns(
      [
        item({ id: "i1", price: 10, splitBetween: ["p1"] }),
        item({ id: "i2", price: 8, splitBetween: [] }),
      ],
      [ana, ben],
      0,
      0,
    );
    expect(result.subtotal).toBe(18);
    expect(totalFor(result, "p1")).toBe(10);
    expect(totalFor(result, "p2")).toBe(0);
  });

  it("returns an empty breakdown list when there are no participants", () => {
    const result = computeBreakdowns(
      [item({ price: 10, splitBetween: ["p1"] })],
      [],
      1,
      1,
    );
    expect(result.breakdowns).toEqual([]);
    expect(result.subtotal).toBe(10);
    expect(result.grandTotal).toBe(12);
  });
});
