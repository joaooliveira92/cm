import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { lintFileSet } from "../../../../scripts/effect-lint.js";

const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const fixture = join(repoRoot, "scripts", "effect-lint-fixtures", "no-raw-text-size.tsx");

/**
 * The type-scale guard. Screens size text by role (`text-heading`, `text-data`,
 * ...); a numeric Tailwind size is how per-screen drift starts again.
 */
describe("no-raw-text-size guard", () => {
  it("sees a raw size in an attribute, a variant, an arbitrary value, and a hoisted constant", () => {
    const { fixtureBoundaries } = lintFileSet(repoRoot, [fixture]);
    const messages = fixtureBoundaries[0]!.violations
      .filter((v) => v.rule === "no-raw-text-size")
      .map((v) => v.message);
    expect(messages).toHaveLength(4);
    for (const size of ["text-xs", "text-2xl", "sm:text-lg", "text-[11px]"]) {
      expect(messages.some((m) => m.includes(size.replace("sm:", "")))).toBe(true);
    }
  });

  it("leaves colour utilities and type-scale roles alone", () => {
    const { fixtureBoundaries } = lintFileSet(repoRoot, [fixture]);
    const messages = fixtureBoundaries[0]!.violations.map((v) => v.message).join("\n");
    expect(messages).not.toContain("`text-text-secondary`");
    expect(messages).not.toContain("`text-heading`");
  });
});
