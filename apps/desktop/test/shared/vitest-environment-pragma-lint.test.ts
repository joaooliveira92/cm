import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { lintFileSet } from "../../../../scripts/effect-lint.js";

const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));

/**
 * The environment-pragma rule (gate-red-on-dev ticket 06).
 *
 * This spec lives under `apps/desktop/test/`, which is exactly the tree the rule polices, so it
 * must never contain the banned literal — a spec that spelled it out would fail the gate it proves.
 * It is assembled from two halves here for the same reason the rule assembles it, and the probe
 * files are written to a temp tree whose layout mimics `apps/<pkg>/test/` so the path predicate is
 * exercised rather than bypassed.
 */
const PRAGMA = `@vitest${"-"}environment`;

describe("vitest-environment-pragma", () => {
  const withProbe = <A,>(relPath: string, contents: string, use: (root: string, file: string) => A): A => {
    const root = mkdtempSync(join(tmpdir(), "vitest-pragma-lint-"));
    try {
      const file = join(root, relPath);
      mkdirSync(join(file, ".."), { recursive: true });
      writeFileSync(file, contents);
      return use(root, file);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  };

  const lint = (relPath: string, contents: string) =>
    withProbe(relPath, contents, (root, file) =>
      lintFileSet(root, [file]).treeViolations.filter((v) => v.rule === "vitest-environment-pragma"),
    );

  it("fires on a test file that applies the pragma", () => {
    const violations = lint(
      join("apps", "desktop", "test", "renderer", "probe.test.ts"),
      `/**\n * ${PRAGMA} jsdom\n */\nexport const n = 1\n`,
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]!.line).toBe(2);
  });

  /**
   * The case that made the rule necessary. Ticket 04's regression guard quoted the pragma in prose
   * explaining why the file deliberately had none; vitest matched the quoted string, applied jsdom
   * anyway, and the guard silently stopped guarding. A rule that only caught real uses would have
   * let that through.
   */
  it("fires on a comment that merely mentions the pragma, because vitest does not tell them apart", () => {
    const violations = lint(
      join("apps", "desktop", "test", "main", "probe.test.ts"),
      `/**\n * This file deliberately carries no ${PRAGMA} pragma.\n */\nexport const n = 1\n`,
    );
    expect(violations).toHaveLength(1);
  });

  it("reports every line, so one pass fixes the whole file", () => {
    const violations = lint(
      join("apps", "desktop", "test", "main", "probe.test.ts"),
      `// ${PRAGMA} node\nexport const n = 1\n// ${PRAGMA} jsdom\n`,
    );
    expect(violations.map((v) => v.line)).toEqual([1, 3]);
  });

  it("names the config as the place the split lives", () => {
    const violations = lint(
      join("apps", "desktop", "test", "main", "probe.test.ts"),
      `// ${PRAGMA} node\nexport const n = 1\n`,
    );
    expect(violations[0]!.message).toContain("apps/desktop/vitest.config.ts");
  });

  it("stays out of src, which has no projects split to contradict", () => {
    const violations = lint(
      join("apps", "desktop", "src", "renderer", "probe.ts"),
      `// ${PRAGMA} jsdom\nexport const n = 1\n`,
    );
    expect(violations).toEqual([]);
  });

  it("stays out of packages, whose test trees the desktop config does not govern", () => {
    const violations = lint(
      join("packages", "shared", "test", "probe.test.ts"),
      `// ${PRAGMA} jsdom\nexport const n = 1\n`,
    );
    expect(violations).toEqual([]);
  });

  it("is silent on a clean test file, so it cannot be passing by always firing", () => {
    const violations = lint(
      join("apps", "desktop", "test", "main", "probe.test.ts"),
      "export const n = 1\n",
    );
    expect(violations).toEqual([]);
  });

  it("the real tree is clean, so the gate is green on its own terms", () => {
    const { treeViolations } = lintFileSet(repoRoot, []);
    expect(treeViolations.filter((v) => v.rule === "vitest-environment-pragma")).toEqual([]);
  });
});
