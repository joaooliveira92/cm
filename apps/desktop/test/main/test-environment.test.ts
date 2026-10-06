import { describe, expect, it } from "vitest";

/**
 * The main-process counterpart to `test/renderer/test-environment.test.ts`: the
 * node project must not hand a DOM to main-process code. Without this, only half
 * the split is guarded -- setting the renderer's environment on the node project,
 * or hoisting it to the root, would break the boundary silently.
 *
 * Do not name the per-file environment pragma in this docblock. Vitest scans a
 * file's leading comments for it, so writing it out -- even in prose explaining
 * its absence -- would give this file a DOM and invert the assertion below.
 */
describe("the node project's test environment", () => {
  it("gives a file under test/main/ no DOM", () => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");
  });
});
