import { describe, expect, it } from "vitest";
import { fromSchema, recoverJson } from "~/splitter/utils/receiptSchema";

describe("recoverJson", () => {
  it("returns a clean object unchanged", () => {
    const json = '{"a":1}';
    expect(recoverJson(json)).toBe('{"a":1}');
  });

  it("strips a leading sentence and a trailing ```json fence", () => {
    const reply = 'Here is the receipt: ```json\n{"a":1}\n``` done';
    expect(recoverJson(reply)).toBe('{"a":1}');
  });

  it("stops at the first complete top-level object, ignoring trailing prose", () => {
    expect(recoverJson('{"a":1} and then some notes')).toBe('{"a":1}');
  });

  it("returns null when there is no object at all", () => {
    expect(recoverJson("no json here")).toBeNull();
  });

  it("ignores braces that appear inside strings", () => {
    const json = '{"name":"a } b [ c"}';
    expect(recoverJson(json)).toBe(json);
  });

  it("respects escaped quotes inside strings", () => {
    const json = '{"name":"say \\"hi\\""}';
    expect(recoverJson(json)).toBe(json);
  });

  it("closes an object truncated mid-generation back to the last clean value", () => {
    // Cut off right after an item object closed but before the array/object did.
    const truncated = '{"items":[{"name":"A","price":1.00}';
    const recovered = recoverJson(truncated);
    expect(recovered).toBe('{"items":[{"name":"A","price":1.00}]}');
    expect(() => JSON.parse(recovered!)).not.toThrow();
  });

  it("returns null when nothing completed before the cut", () => {
    expect(recoverJson('{"items":[{"name":"A"')).toBeNull();
  });
});

describe("fromSchema", () => {
  it("reads items, per-item adjustments, order discounts, tax and tip", () => {
    const reply = JSON.stringify({
      items: [
        {
          name: "KS FRZ GAL",
          price: 13.99,
          adjustments: [{ name: "Instant savings", price: -3.0 }],
        },
        { name: "BEEF ROLLS", price: 14.99, adjustments: [] },
      ],
      orderDiscounts: [{ name: "Member savings", price: -6.5 }],
      taxes: [{ name: "TAX", amount: 7.17 }],
      tip: 0,
    });

    const result = fromSchema(reply)!;
    expect(result.items).toEqual([
      {
        description: "KS FRZ GAL",
        total_amount: 13.99,
        children: [{ description: "Instant savings", total_amount: -3 }],
      },
      { description: "BEEF ROLLS", total_amount: 14.99 },
      { description: "Member savings", total_amount: -6.5 },
    ]);
    expect(result.tax).toBe(7.17);
    expect(result.taxLineCount).toBe(1);
    expect(result.tip).toBeUndefined();
  });

  it("reads a tax amount the model emitted under 'price' instead of 'amount'", () => {
    const reply = JSON.stringify({
      items: [{ name: "A", price: 1, adjustments: [] }],
      taxes: [{ name: "TAX", price: 0.85 }],
      tip: 0,
    });
    expect(fromSchema(reply)!.tax).toBe(0.85);
  });

  it("coerces string numbers and rejects non-numeric ones", () => {
    const reply = JSON.stringify({
      items: [
        { name: "A", price: "12.50", adjustments: [] },
        { name: "B", price: "abc", adjustments: [] },
      ],
      tip: 0,
    });
    expect(fromSchema(reply)!.items).toEqual([
      { description: "A", total_amount: 12.5 },
    ]);
  });

  it("sums multiple tax lines and counts them", () => {
    const reply = JSON.stringify({
      items: [{ name: "A", price: 1, adjustments: [] }],
      taxes: [
        { name: "STATE", amount: 0.5 },
        { name: "CITY", amount: 0.35 },
      ],
      tip: 0,
    });
    const result = fromSchema(reply)!;
    expect(result.tax).toBeCloseTo(0.85);
    expect(result.taxLineCount).toBe(2);
  });

  it("drops non-positive tax lines", () => {
    const reply = JSON.stringify({
      items: [{ name: "A", price: 1, adjustments: [] }],
      taxes: [
        { name: "TAX", amount: 0 },
        { name: "REFUND", amount: -1 },
      ],
      tip: 0,
    });
    const result = fromSchema(reply)!;
    expect(result.tax).toBeUndefined();
    expect(result.taxLineCount).toBe(0);
  });

  it("keeps a zero-priced item adjustment (a free modification)", () => {
    const reply = JSON.stringify({
      items: [
        {
          name: "Burger",
          price: 10,
          adjustments: [{ name: "No onions", price: 0 }],
        },
      ],
      tip: 0,
    });
    expect(fromSchema(reply)!.items[0].children).toEqual([
      { description: "No onions", total_amount: 0 },
    ]);
  });

  it("drops zero-amount order-level discounts", () => {
    const reply = JSON.stringify({
      items: [{ name: "A", price: 1, adjustments: [] }],
      orderDiscounts: [{ name: "Nothing", price: 0 }],
      tip: 0,
    });
    expect(fromSchema(reply)!.items).toEqual([
      { description: "A", total_amount: 1 },
    ]);
  });

  it("also reads order discounts the model placed under a flat 'adjustments' key", () => {
    const reply = JSON.stringify({
      items: [{ name: "A", price: 1, adjustments: [] }],
      adjustments: [{ name: "Member savings", price: -6.5 }],
      tip: 0,
    });
    expect(fromSchema(reply)!.items).toContainEqual({
      description: "Member savings",
      total_amount: -6.5,
    });
  });

  it("reports a positive tip and omits a zero one", () => {
    const withTip = JSON.stringify({
      items: [{ name: "A", price: 1, adjustments: [] }],
      tip: 5,
    });
    expect(fromSchema(withTip)!.tip).toBe(5);
  });

  it("rejects an amount of 10000 or more as a misread", () => {
    const reply = JSON.stringify({
      items: [
        { name: "Sane", price: 12, adjustments: [] },
        { name: "Bogus", price: 10000, adjustments: [] },
      ],
      tip: 0,
    });
    expect(fromSchema(reply)!.items).toEqual([
      { description: "Sane", total_amount: 12 },
    ]);
  });

  it("skips items missing a name or price", () => {
    const reply = JSON.stringify({
      items: [
        { name: "", price: 5, adjustments: [] },
        { name: "  ", price: 5, adjustments: [] },
        { price: 5, adjustments: [] },
        { name: "Good", price: 5, adjustments: [] },
      ],
      tip: 0,
    });
    expect(fromSchema(reply)!.items).toEqual([
      { description: "Good", total_amount: 5 },
    ]);
  });

  it("returns null when the reply has no JSON object", () => {
    expect(fromSchema("sorry, I can't read this")).toBeNull();
  });

  it("returns null when the JSON is malformed beyond recovery", () => {
    expect(fromSchema("{ not: valid, json }")).toBeNull();
  });

  it("returns null when 'items' is missing or not an array", () => {
    expect(fromSchema(JSON.stringify({ tip: 0 }))).toBeNull();
    expect(fromSchema(JSON.stringify({ items: "nope", tip: 0 }))).toBeNull();
  });

  it("recovers items from a reply truncated mid-generation", () => {
    const truncated =
      '{"items":[{"name":"A","price":1.00,"adjustments":[]},' +
      '{"name":"B","price":2.00,"adjustments":[]}';
    const result = fromSchema(truncated)!;
    expect(result).not.toBeNull();
    expect(result.items).toEqual([
      { description: "A", total_amount: 1 },
      { description: "B", total_amount: 2 },
    ]);
  });
});
