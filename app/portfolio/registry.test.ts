import { describe, expect, it } from "vitest";
import { getSection } from "~/portfolio/registry";

describe("getSection", () => {
  it.each(["hero", "experience_list", "project_list"])(
    "resolves the registered '%s' section to a component",
    (type) => {
      expect(getSection(type)).toBeTypeOf("function");
    },
  );

  it("returns null for an unknown section type", () => {
    expect(getSection("does_not_exist")).toBeNull();
  });

  it("returns null for an empty type string", () => {
    expect(getSection("")).toBeNull();
  });
});
