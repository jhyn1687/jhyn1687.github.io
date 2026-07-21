import { describe, expect, it } from "vitest";
import { colorForIndex, nextColorSeed } from "~/splitter/utils/colors";

// These tests assert behaviour relative to the palette's length rather than
// hard-coding class strings, so restyling a colour can't break them.
const PALETTE_SIZE = 7;

describe("colorForIndex", () => {
  it("returns a distinct colour for each of the first six indices", () => {
    const chips = Array.from({ length: PALETTE_SIZE }, (_, i) =>
      colorForIndex(i),
    ).map((c) => c.chip);
    expect(new Set(chips).size).toBe(PALETTE_SIZE);
  });

  it("wraps around once the palette is exhausted", () => {
    expect(colorForIndex(PALETTE_SIZE)).toEqual(colorForIndex(0));
    expect(colorForIndex(PALETTE_SIZE + 1)).toEqual(colorForIndex(1));
  });

  it("returns a fully-populated colour object", () => {
    const c = colorForIndex(0);
    expect(c).toMatchObject({
      chip: expect.any(String),
      avatar: expect.any(String),
      text: expect.any(String),
      button: expect.any(String),
    });
  });
});

describe("nextColorSeed", () => {
  it("starts at 0 when there are no participants", () => {
    expect(nextColorSeed([])).toBe(0);
  });

  it("starts at 0 when no participant carries a colour", () => {
    expect(nextColorSeed([{}, {}])).toBe(0);
  });

  it("returns one past the highest palette index in use", () => {
    const participants = [
      { color: colorForIndex(0) },
      { color: colorForIndex(2) },
    ];
    expect(nextColorSeed(participants)).toBe(3);
  });

  it("ignores participants without a colour when finding the max", () => {
    const participants = [{ color: colorForIndex(1) }, {}];
    expect(nextColorSeed(participants)).toBe(2);
  });

  it("is unaffected by the order participants are listed in", () => {
    const participants = [
      { color: colorForIndex(4) },
      { color: colorForIndex(1) },
    ];
    expect(nextColorSeed(participants)).toBe(5);
  });

  it("ignores a colour whose chip is not in the palette", () => {
    expect(nextColorSeed([{ color: { chip: "unknown" } as never }])).toBe(0);
  });
});
