import { describe, expect, it } from "vitest";
import { cn } from "../../../src/renderer/lib/utils.js";

/**
 * The type-scale roles (`text-heading`, `text-data`, ...) are font sizes, but
 * tailwind-merge reads an unknown `text-*` as a colour. These pin the grouping
 * `lib/utils.ts` registers, so a role and a colour both survive `cn()`.
 */
describe("cn with type-scale roles", () => {
  it("keeps a role beside a colour utility", () => {
    expect(cn("text-heading", "text-text-secondary")).toBe("text-heading text-text-secondary");
    expect(cn("text-text-soft", "text-body")).toBe("text-text-soft text-body");
  });

  it("lets a later role replace an earlier one", () => {
    expect(cn("text-body", "text-data")).toBe("text-data");
  });
});
