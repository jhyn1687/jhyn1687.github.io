import { describe, expect, it } from "vitest";
import type { Bill, Item, Participant } from "~/splitter/types";
import { buildShareMeta, formatMoney } from "~/splitter/utils/shareMeta";

const color = { chip: "", avatar: "", text: "", button: "" };

function person(id: string, name: string): Participant {
  return { id, name, color };
}

function item(
  name: string,
  price: number,
  splitBetween: string[],
  children?: Item["children"],
): Item {
  return { id: `i-${name}`, name, price, splitBetween, children };
}

function bill(overrides: Partial<Bill> = {}): Bill {
  return {
    title: "Dinner",
    participants: [person("a", "Tony"), person("b", "Alex")],
    items: [item("Ramen", 20, ["a"]), item("Gyoza", 10, ["a", "b"])],
    tax: 0,
    tip: 0,
    ...overrides,
  };
}

describe("formatMoney", () => {
  it("formats with two decimals", () => {
    expect(formatMoney(12.5)).toBe("$12.50");
  });

  it("puts the sign outside the symbol", () => {
    expect(formatMoney(-3)).toBe("-$3.00");
  });

  it("treats a blank (NaN) amount as zero", () => {
    expect(formatMoney(NaN)).toBe("$0.00");
  });
});

describe("buildShareMeta", () => {
  it("titles the preview with the bill name", () => {
    expect(buildShareMeta(bill()).title).toBe("Dinner");
  });

  it("falls back to a generic name when the title is blank", () => {
    expect(buildShareMeta(bill({ title: "   " })).title).toBe("Shared bill");
  });

  it("gives each person their own line", () => {
    expect(buildShareMeta(bill()).description).toBe(
      "Tony: $25.00\nAlex: $5.00",
    );
  });

  it("includes each person's share of tax and tip", () => {
    // Tony bought $25 of a $30 subtotal, so he carries 5/6 of the $6 tax.
    expect(buildShareMeta(bill({ tax: 6 })).description).toBe(
      "Tony: $30.00\nAlex: $6.00",
    );
  });

  it("counts sub-items into a person's total", () => {
    const withChild = bill({
      participants: [person("a", "Tony")],
      items: [
        item("Burger", 10, ["a"], [{ id: "c1", name: "Bacon", price: 2 }]),
      ],
    });
    expect(buildShareMeta(withChild).description).toBe("Tony: $12.00");
  });

  it("names an unnamed participant", () => {
    const unnamed = bill({
      participants: [person("a", "")],
      items: [item("Ramen", 20, ["a"])],
    });
    expect(buildShareMeta(unnamed).description).toBe("Someone: $20.00");
  });

  it("collapses a long roster into a count", () => {
    const names = "abcdefghijklmno".split("");
    const many = bill({
      participants: names.map((n) => person(n, n.toUpperCase())),
      items: [item("Pizza", 150, names)],
    });
    const lines = buildShareMeta(many).description.split("\n");
    expect(lines).toHaveLength(13);
    expect(lines[0]).toBe("A: $10.00");
    expect(lines[11]).toBe("L: $10.00");
    expect(lines[12]).toBe("+3 more");
  });

  it("stops at the character budget unfurlers truncate to", () => {
    const ids = ["0", "1", "2", "3", "4", "5", "6", "7"];
    const wordy = bill({
      participants: ids.map((id) => person(id, "Bartholomew".repeat(4))),
      items: [item("Pizza", 80, ids)],
    });
    const { description } = buildShareMeta(wordy);
    const lines = description.split("\n");
    expect(description.length).toBeLessThanOrEqual(300);
    expect(lines).toHaveLength(6);
    expect(lines.at(-1)).toBe("+3 more");
  });

  it("keeps a single over-long line rather than hiding everyone", () => {
    const one = bill({
      participants: [person("a", "Bartholomew".repeat(40))],
      items: [item("Pizza", 10, ["a"])],
    });
    expect(buildShareMeta(one).description).toContain("$10.00");
  });

  it("returns an empty description for a bill with no participants", () => {
    expect(
      buildShareMeta(bill({ participants: [], items: [] })).description,
    ).toBe("");
  });
});
