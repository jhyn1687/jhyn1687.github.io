import { describe, expect, it } from "vitest";
import { parseReceiptText } from "~/splitter/utils/parseReceiptText";

describe("parseReceiptText — items", () => {
  it("parses plain 'name  price' lines into items", () => {
    const result = parseReceiptText("Burger  10.00\nFries  4.50");
    expect(result.items).toEqual([
      { description: "Burger", total_amount: 10 },
      { description: "Fries", total_amount: 4.5 },
    ]);
  });

  it("strips a leading dollar sign", () => {
    expect(parseReceiptText("Latte  $4.25").items).toEqual([
      { description: "Latte", total_amount: 4.25 },
    ]);
  });

  it("reads a leading-minus discount as negative", () => {
    expect(parseReceiptText("Coupon  -2.00").items).toEqual([
      { description: "Coupon", total_amount: -2 },
    ]);
  });

  it("reads a trailing-minus (Costco-style) discount as negative", () => {
    expect(parseReceiptText("Instant Rebate  3.00-").items).toEqual([
      { description: "Instant Rebate", total_amount: -3 },
    ]);
  });

  it("ignores lines with no recognisable price", () => {
    expect(parseReceiptText("Thank you for shopping!\n***").items).toEqual([]);
  });

  it("requires two decimal places, so a bare integer is not a price", () => {
    expect(parseReceiptText("Table 12").items).toEqual([]);
  });

  it("drops absurd amounts of 10000 or more (misread lines)", () => {
    expect(parseReceiptText("Weird  10000.00").items).toEqual([]);
    expect(parseReceiptText("Fine  9999.99").items).toEqual([
      { description: "Fine", total_amount: 9999.99 },
    ]);
  });

  it("skips a zero-priced top-level line", () => {
    expect(parseReceiptText("Freebie  0.00").items).toEqual([]);
  });

  it("skips single-character descriptions", () => {
    expect(parseReceiptText("X  5.00").items).toEqual([]);
  });

  it("ignores blank lines", () => {
    expect(parseReceiptText("\n\nBurger  10.00\n\n").items).toEqual([
      { description: "Burger", total_amount: 10 },
    ]);
  });
});

describe("parseReceiptText — skip words", () => {
  it("drops summary and tender lines using word boundaries", () => {
    const text = [
      "Burger  10.00",
      "SUBTOTAL  10.00",
      "TOTAL  10.85",
      "BALANCE DUE  10.85",
      "VISA  10.85",
      "CHANGE  0.00",
    ].join("\n");
    expect(parseReceiptText(text).items).toEqual([
      { description: "Burger", total_amount: 10 },
    ]);
  });

  it("does not let 'cash'/'change'/'due' match inside real item names", () => {
    const text = [
      "CASHEWS  6.00",
      "EXCHANGE PLATE  8.00",
      "FONDUE  12.00",
    ].join("\n");
    expect(parseReceiptText(text).items).toEqual([
      { description: "CASHEWS", total_amount: 6 },
      { description: "EXCHANGE PLATE", total_amount: 8 },
      { description: "FONDUE", total_amount: 12 },
    ]);
  });
});

describe("parseReceiptText — savings tally", () => {
  it("drops a positive savings-total line that restates discounts", () => {
    const text = "Item  13.99\nINSTANT SAVINGS  6.50";
    expect(parseReceiptText(text).items).toEqual([
      { description: "Item", total_amount: 13.99 },
    ]);
  });

  it("keeps a genuine negative savings line as a discount", () => {
    const text = "Item  13.99\nInstant Savings  -6.50";
    expect(parseReceiptText(text).items).toEqual([
      { description: "Item", total_amount: 13.99 },
      { description: "Instant Savings", total_amount: -6.5 },
    ]);
  });
});

describe("parseReceiptText — tax", () => {
  it("extracts a single tax line", () => {
    const result = parseReceiptText("Burger  10.00\nTAX  0.85");
    expect(result.tax).toBe(0.85);
    expect(result.taxLineCount).toBe(1);
  });

  it("sums split state and city tax and counts both lines", () => {
    const result = parseReceiptText(
      "Burger  10.00\nSTATE TAX  0.50\nCITY TAX  0.35",
    );
    expect(result.tax).toBeCloseTo(0.85);
    expect(result.taxLineCount).toBe(2);
  });

  it("prefers the charged tax over a 'TOTAL TAX' restatement of the same money", () => {
    const result = parseReceiptText(
      "Burger  10.00\nTAX  0.85\nTOTAL TAX  0.85",
    );
    expect(result.tax).toBe(0.85);
    expect(result.taxLineCount).toBe(1);
  });

  it("falls back to the restatement when it is the only tax line", () => {
    const result = parseReceiptText("Burger  10.00\nTOTAL TAX  0.85");
    expect(result.tax).toBe(0.85);
    expect(result.taxLineCount).toBe(1);
  });

  it("reports no tax when none is present", () => {
    const result = parseReceiptText("Burger  10.00");
    expect(result.tax).toBeUndefined();
    expect(result.taxLineCount).toBe(0);
  });

  it("does not treat a negative 'tax'-labelled line as tax", () => {
    // amount must be > 0 to count as tax; otherwise it is an ordinary line.
    const result = parseReceiptText("Tax Refund  -1.00");
    expect(result.tax).toBeUndefined();
    expect(result.items).toEqual([
      { description: "Tax Refund", total_amount: -1 },
    ]);
  });
});

describe("parseReceiptText — tip", () => {
  it("extracts a tip line", () => {
    expect(parseReceiptText("Meal  20.00\nTIP  4.00").tip).toBe(4);
  });

  it("recognises gratuity as tip", () => {
    expect(parseReceiptText("Meal  20.00\nGratuity  3.60").tip).toBe(3.6);
  });

  it("reports no tip when none is present", () => {
    expect(parseReceiptText("Meal  20.00").tip).toBeUndefined();
  });
});

describe("parseReceiptText — children (indented adjustments)", () => {
  it("attaches an indented line to the item above it", () => {
    const text = "Burger  10.00\n  Extra bacon  2.00";
    expect(parseReceiptText(text).items).toEqual([
      {
        description: "Burger",
        total_amount: 10,
        children: [{ description: "Extra bacon", total_amount: 2 }],
      },
    ]);
  });

  it("keeps a zero-price indented modification as a child", () => {
    const text = "Burger  10.00\n  No onions  0.00";
    expect(parseReceiptText(text).items).toEqual([
      {
        description: "Burger",
        total_amount: 10,
        children: [{ description: "No onions", total_amount: 0 }],
      },
    ]);
  });

  it("attaches multiple children to the same parent", () => {
    const text = "Burger  10.00\n  Extra bacon  2.00\n  Discount  -1.00";
    expect(parseReceiptText(text).items[0].children).toEqual([
      { description: "Extra bacon", total_amount: 2 },
      { description: "Discount", total_amount: -1 },
    ]);
  });

  it("promotes an indented line to a top-level item when nothing precedes it", () => {
    // No parent exists yet, so it cannot be a child; it stands on its own.
    expect(parseReceiptText("  Orphan  5.00").items).toEqual([
      { description: "Orphan", total_amount: 5 },
    ]);
  });
});
