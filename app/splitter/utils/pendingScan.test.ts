import { afterEach, describe, expect, it, vi } from "vitest";
import { setPendingScan, takePendingScan } from "~/splitter/utils/pendingScan";

function receipt(name = "receipt.jpg") {
  return new File(["x"], name, { type: "image/jpeg" });
}

afterEach(() => {
  vi.useRealTimers();
  // The slot is module state, so drain it rather than leaking into the next test.
  takePendingScan();
});

describe("pendingScan", () => {
  it("returns nothing when no drop is pending", () => {
    expect(takePendingScan()).toBeNull();
  });

  it("hands the parked file to the first caller", () => {
    const file = receipt();
    setPendingScan(file);
    expect(takePendingScan()).toBe(file);
  });

  it("empties the slot, so one drop is scanned at most once", () => {
    setPendingScan(receipt());
    takePendingScan();
    expect(takePendingScan()).toBeNull();
  });

  it("keeps only the newest drop", () => {
    const second = receipt("second.jpg");
    setPendingScan(receipt("first.jpg"));
    setPendingScan(second);
    expect(takePendingScan()).toBe(second);
  });

  it("expires a handoff whose navigation never landed", () => {
    vi.useFakeTimers();
    setPendingScan(receipt());
    vi.advanceTimersByTime(11_000);
    expect(takePendingScan()).toBeNull();
  });

  it("still hands over a file claimed on the next navigation", () => {
    vi.useFakeTimers();
    const file = receipt();
    setPendingScan(file);
    vi.advanceTimersByTime(200);
    expect(takePendingScan()).toBe(file);
  });
});
