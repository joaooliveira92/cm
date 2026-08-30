import { describe, expect, it } from "vitest";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isBoundaryEnforced, lintFileSet } from "../../scripts/effect-lint.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const fixtureRoot = join(repoRoot, "scripts", "effect-lint-fixtures");
const rendererDir = join(repoRoot, "apps", "desktop", "src", "renderer");

describe("renderer dependency-boundary lint (AC-09)", () => {
  it("ships failing fixtures that trip the renderer-boundary rule", async () => {
    const files = (await readdir(fixtureRoot)).filter((f) => f.endsWith(".tsx")).map((f) => join(fixtureRoot, f));
    expect(files.length).toBeGreaterThan(0);
    const { fixtureBoundaries } = lintFileSet(repoRoot, files);
    expect(fixtureBoundaries.length).toBe(files.length);
    for (const entry of fixtureBoundaries) {
      expect(entry.violations.filter((v) => v.rule === "renderer-boundary").length).toBeGreaterThan(0);
    }
  });

  it("flags a direct window.cmClone.call and direct atom package imports", async () => {
    const { fixtureBoundaries } = lintFileSet(repoRoot, [join(fixtureRoot, "renderer-boundary.tsx")]);
    const messages = fixtureBoundaries[0]!.violations.map((v) => v.message);
    expect(messages.some((m) => m.includes("window.cmClone.call"))).toBe(true);
    expect(messages.some((m) => m.includes("@effect/atom-react"))).toBe(true);
    expect(messages.some((m) => m.includes("effect/unstable/reactivity"))).toBe(true);
  });

  it("real career screens import only the seam and trigger no boundary violation", async () => {
    const screenFiles = [
      join(rendererDir, "SquadScreen.tsx"),
      join(rendererDir, "LeagueTableScreen.tsx"),
      join(rendererDir, "TransfersScreen.tsx"),
      join(rendererDir, "MatchDayScreen.tsx"),
      join(rendererDir, "TacticsScreen.tsx"),
      join(rendererDir, "App.tsx"),
    ];
    const { treeViolations } = lintFileSet(repoRoot, screenFiles);
    expect(treeViolations.filter((v) => v.rule === "renderer-boundary")).toHaveLength(0);
  });

  it("the seam itself is exempt from the boundary", () => {
    expect(isBoundaryEnforced(join(rendererDir, "rpc.ts"))).toBe(false);
    expect(isBoundaryEnforced(join(rendererDir, "rpc", "call.ts"))).toBe(false);
    expect(isBoundaryEnforced(join(rendererDir, "SquadScreen.tsx"))).toBe(true);
    expect(isBoundaryEnforced(join(fixtureRoot, "renderer-boundary.tsx"))).toBe(true);
  });
});