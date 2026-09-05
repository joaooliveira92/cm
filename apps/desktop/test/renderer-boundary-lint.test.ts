import { describe, expect, it } from "vitest";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtureRuleName, isBoundaryEnforced, lintFileSet } from "../../scripts/effect-lint.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const fixtureRoot = join(repoRoot, "scripts", "effect-lint-fixtures");
const rendererDir = join(repoRoot, "apps", "desktop", "src", "renderer");

describe("renderer dependency-boundary lint (AC-09)", () => {
  it("ships a failing fixture per rule, each still tripping the rule its name claims", async () => {
    const files = (await readdir(fixtureRoot)).filter((f) => f.endsWith(".tsx")).map((f) => join(fixtureRoot, f));
    expect(files.length).toBeGreaterThan(0);
    const { fixtureBoundaries } = lintFileSet(repoRoot, files);
    expect(fixtureBoundaries.length).toBe(files.length);
    // A fixture's file stem names the rule it proves, which is the same
    // convention `assertFixtureCoverage` enforces on every gate run — adding a
    // rule means adding a fixture, and nothing else has to be kept in sync.
    for (const entry of fixtureBoundaries) {
      const rule = fixtureRuleName(entry.file);
      expect(entry.violations.filter((v) => v.rule === rule).length).toBeGreaterThan(0);
    }
  });

  it("flags a direct window.cmClone.call, direct atom imports, and direct react-hotkeys-hook imports", async () => {
    const { fixtureBoundaries } = lintFileSet(repoRoot, [join(fixtureRoot, "renderer-boundary.tsx")]);
    const messages = fixtureBoundaries[0]!.violations.map((v) => v.message);
    expect(messages.some((m) => m.includes("window.cmClone.call"))).toBe(true);
    expect(messages.some((m) => m.includes("@effect/atom-react"))).toBe(true);
    expect(messages.some((m) => m.includes("effect/unstable/reactivity"))).toBe(true);
    expect(messages.some((m) => m.includes("react-hotkeys-hook"))).toBe(true);
  });

  it("the keyboard-binding seam hotkeys.ts is exempt from the hotkeys boundary", () => {
    expect(isBoundaryEnforced(join(rendererDir, "hotkeys.ts"))).toBe(false);
    expect(isBoundaryEnforced(join(rendererDir, "KeyboardSpine.tsx"))).toBe(true);
  });

  it("Stage-2 route/creation/navigation + Stage-3 keyboard-spine surfaces import only the seams and trip no boundary violation", async () => {
    const screenFiles = [
      join(rendererDir, "squad", "SquadScreen.tsx"),
      join(rendererDir, "LeagueTableScreen.tsx"),
      join(rendererDir, "transfers", "TransfersScreen.tsx"),
      join(rendererDir, "match", "MatchDayScreen.tsx"),
      join(rendererDir, "TacticsScreen.tsx"),
      join(rendererDir, "KeyboardSpine.tsx"),
      join(rendererDir, "actions", "allActions.ts"),
      join(rendererDir, "actions", "registry.ts"),
      join(rendererDir, "actions", "dispatch.ts"),
      join(rendererDir, "actions", "types.ts"),
      join(rendererDir, "keymap", "prefix.ts"),
      join(rendererDir, "keymap", "priority.ts"),
      join(rendererDir, "keymap", "keystroke.ts"),
      join(rendererDir, "keymap", "timeout.ts"),
      join(rendererDir, "router", "index.tsx"),
      join(rendererDir, "router", "career.tsx"),
      join(rendererDir, "router", "createFlow.tsx"),
      join(rendererDir, "router", "RouteView.tsx"),
      join(rendererDir, "router", "mainMenu.tsx"),
      join(rendererDir, "navigation", "adapter.ts"),
      join(rendererDir, "navigation", "destinations.ts"),
      join(rendererDir, "navigation", "params.ts"),
      join(rendererDir, "focus.ts"),
      join(rendererDir, "match", "session.ts"),
    ];
    const { treeViolations } = lintFileSet(repoRoot, screenFiles);
    expect(treeViolations.filter((v) => v.rule === "renderer-boundary")).toHaveLength(0);
  });

  it("Stage 2 removed the root screen-state machine, not merely unused it", async () => {
    const { readFile } = await import("node:fs/promises");
    const { access } = await import("node:fs/promises");
    await expect(access(join(rendererDir, "App.tsx"))).rejects.toThrow();
    const files = (await readdir(rendererDir, { recursive: true })).filter(
      (f) => f.endsWith(".ts") || f.endsWith(".tsx"),
    );
    const sources = await Promise.all(
      files.map((f) => readFile(join(rendererDir, f), "utf8")),
    );
    for (const name of ["setLoadedSave", "setCreating", "setCreationState", "setScreen"]) {
      for (const source of sources) {
        expect(source).not.toContain(name);
      }
    }
  });

  it("the seam itself is exempt from the boundary", () => {
    expect(isBoundaryEnforced(join(rendererDir, "rpc.ts"))).toBe(false);
    expect(isBoundaryEnforced(join(rendererDir, "rpc", "call.ts"))).toBe(false);
    expect(isBoundaryEnforced(join(rendererDir, "squad", "SquadScreen.tsx"))).toBe(true);
    expect(isBoundaryEnforced(join(fixtureRoot, "renderer-boundary.tsx"))).toBe(true);
  });
});