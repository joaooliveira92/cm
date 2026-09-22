import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { lintFileSet } from "../../../../scripts/effect-lint.js";

const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));

/**
 * The locale-free-sort rule (group-g ticket 38). Probes are written to a temp tree that mimics the
 * repo layout, so the path scoping is exercised rather than bypassed.
 */
describe("no-locale-compare", () => {
  const lint = (relPath: string, contents: string) => {
    const root = mkdtempSync(join(tmpdir(), "locale-compare-lint-"));
    try {
      const file = join(root, relPath);
      mkdirSync(join(file, ".."), { recursive: true });
      writeFileSync(file, contents);
      return lintFileSet(root, [file]).treeViolations.filter((v) => v.rule === "no-locale-compare");
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  };

  const CALL = "export const f = (a: string, b: string) =>\n  a.localeCompare(b)\n";

  it("fires on a call in packages/shared/src", () => {
    const violations = lint(join("packages", "shared", "src", "rules", "probe.ts"), CALL);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.line).toBe(2);
    expect(violations[0]!.message).toContain("compareCodeUnits");
  });

  it("fires on a call in packages/game-engine/src", () => {
    expect(lint(join("packages", "game-engine", "src", "probe.ts"), CALL)).toHaveLength(1);
  });

  it("fires on a bare reference handed to sort, not only on a call", () => {
    const violations = lint(
      join("packages", "shared", "src", "probe.ts"),
      "export const s = (xs: string[]) => xs.sort(Function.call.bind(String.prototype.localeCompare))\n",
    );
    expect(violations).toHaveLength(1);
  });

  it("ignores a mention in a comment or a string", () => {
    const violations = lint(
      join("packages", "shared", "src", "probe.ts"),
      '// unlike localeCompare\nexport const why = "a.localeCompare(b) reads the locale"\n',
    );
    expect(violations).toEqual([]);
  });

  it("stays out of the renderer, where display sorting belongs", () => {
    expect(lint(join("apps", "desktop", "src", "renderer", "probe.ts"), CALL)).toEqual([]);
  });

  it("stays out of the pure packages' tests", () => {
    expect(lint(join("packages", "shared", "test", "probe.test.ts"), CALL)).toEqual([]);
  });

  it("the real tree is clean, so the gate is green on its own terms", () => {
    const { treeViolations } = lintFileSet(repoRoot, []);
    expect(treeViolations.filter((v) => v.rule === "no-locale-compare")).toEqual([]);
  });
});
