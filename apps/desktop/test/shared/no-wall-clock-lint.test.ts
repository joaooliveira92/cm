import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { lintFileSet } from "../../../../scripts/effect-lint.js";

const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));

/**
 * The game-clock rule (gate-red-on-dev ticket 09). Probes are written to a temp tree that mimics the
 * repo layout, so the path scoping is exercised rather than bypassed.
 */
describe("no-wall-clock", () => {
  const lint = (relPath: string, contents: string) => {
    const root = mkdtempSync(join(tmpdir(), "wall-clock-lint-"));
    try {
      const file = join(root, relPath);
      mkdirSync(join(file, ".."), { recursive: true });
      writeFileSync(file, contents);
      return lintFileSet(root, [file]).treeViolations.filter((v) => v.rule === "no-wall-clock");
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  };

  const NEW_DATE = "export const year = () =>\n  new Date().getFullYear()\n";
  const DATE_NOW = "export const now = () =>\n  Date.now()\n";

  it.each(["club", "career", "transfers", "season", "match"])("fires on new Date() and Date.now() in main/%s", (dir) => {
    const newDate = lint(join("apps", "desktop", "src", "main", dir, "probe.ts"), NEW_DATE);
    expect(newDate).toHaveLength(1);
    expect(newDate[0]!.line).toBe(2);
    expect(newDate[0]!.message).toContain("loadGameDate");
    expect(lint(join("apps", "desktop", "src", "main", dir, "probe.ts"), DATE_NOW)).toHaveLength(1);
  });

  it("fires in the pure packages", () => {
    expect(lint(join("packages", "shared", "src", "probe.ts"), DATE_NOW)).toHaveLength(1);
    expect(lint(join("packages", "game-engine", "src", "probe.ts"), NEW_DATE)).toHaveLength(1);
  });

  it("leaves a conversion of a value the caller already holds alone", () => {
    const violations = lint(
      join("apps", "desktop", "src", "main", "season", "probe.ts"),
      "export const iso = (millis: number, text: string) => [new Date(millis), new Date(text)]\n",
    );
    expect(violations).toEqual([]);
  });

  it("ignores a mention in a comment or a string", () => {
    const violations = lint(
      join("apps", "desktop", "src", "main", "club", "probe.ts"),
      '// never new Date() here\nexport const why = "Date.now() is the machine clock"\n',
    );
    expect(violations).toEqual([]);
  });

  it("stays out of world/ metadata timestamps and rpc/ durations", () => {
    expect(lint(join("apps", "desktop", "src", "main", "world", "probe.ts"), NEW_DATE)).toEqual([]);
    expect(lint(join("apps", "desktop", "src", "main", "rpc", "probe.ts"), DATE_NOW)).toEqual([]);
  });

  it("the real tree is clean, so the gate is green on its own terms", () => {
    const { treeViolations } = lintFileSet(repoRoot, []);
    expect(treeViolations.filter((v) => v.rule === "no-wall-clock")).toEqual([]);
  });
});
