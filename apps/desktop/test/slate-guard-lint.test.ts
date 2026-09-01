import { describe, expect, it } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isSlateGuarded,
  lintFileSet,
  readSlateBaseline,
  reconcileSlateBaseline,
} from "../../scripts/effect-lint.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const fixtureRoot = join(repoRoot, "scripts", "effect-lint-fixtures");
const rendererDir = join(repoRoot, "apps", "desktop", "src", "renderer");

/**
 * The flat-slate guard (visual design language, ticket 08).
 *
 * The frame was adopted once and left unbuilt while slate spread underneath it.
 * These tests are what stop that from being possible a second time: the rule has
 * to see slate in every shape a class list arrives in, and the backlog has to
 * refuse to grow.
 */
describe("no-slate-class-name guard", () => {
  it("sees slate in a plain attribute, a template interpolation, and a hoisted constant", () => {
    const { fixtureBoundaries } = lintFileSet(repoRoot, [
      join(fixtureRoot, "no-slate-class-name.tsx"),
    ]);
    const lines = fixtureBoundaries[0]!.violations
      .filter((v) => v.rule === "no-slate-class-name")
      .map((v) => v.line);
    // bg-slate-950 + text-slate-100 (one plain attribute, two classes),
    // text-slate-400 (a template interpolation), bg-slate-700 (hoisted const).
    expect(lines).toHaveLength(4);
    expect(new Set(lines).size).toBeGreaterThan(1);
  });

  it("guards renderer source and the fixtures, not the rest of the tree", () => {
    expect(isSlateGuarded(join(rendererDir, "SquadScreen.tsx"))).toBe(true);
    expect(isSlateGuarded(join(fixtureRoot, "no-slate-class-name.tsx"))).toBe(true);
    expect(isSlateGuarded(join(repoRoot, "scripts", "run-gates.ts"))).toBe(false);
  });

  it("fails on a fresh slate class beyond the recorded backlog", () => {
    const baseline = { "apps/desktop/src/renderer/SquadScreen.tsx": 3 };
    const grown = new Map([["apps/desktop/src/renderer/SquadScreen.tsx", 4]]);
    const violations = reconcileSlateBaseline(repoRoot, baseline, grown);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.message).toContain("fresh");
  });

  it("fails on a brand-new file that has no backlog entry at all", () => {
    const fresh = new Map([["apps/desktop/src/renderer/NewScreen.tsx", 1]]);
    const violations = reconcileSlateBaseline(repoRoot, {}, fresh);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.message).toContain("fresh");
  });

  it("fails on a migrated file whose backlog entry was not tightened", () => {
    const baseline = { "apps/desktop/src/renderer/SquadScreen.tsx": 3 };
    const violations = reconcileSlateBaseline(repoRoot, baseline, new Map());
    expect(violations).toHaveLength(1);
    expect(violations[0]!.message).toContain("Tighten");
  });

  it("passes when the tree matches the backlog exactly", () => {
    const baseline = { "apps/desktop/src/renderer/SquadScreen.tsx": 3 };
    const exact = new Map([["apps/desktop/src/renderer/SquadScreen.tsx", 3]]);
    expect(reconcileSlateBaseline(repoRoot, baseline, exact)).toHaveLength(0);
  });

  it("the committed backlog matches the tree, so the gate is green and the count is honest", async () => {
    const files = (await readdir(rendererDir, { recursive: true }))
      .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
      .map((f) => join(rendererDir, f));
    const { slateCounts } = lintFileSet(repoRoot, files);
    const baseline = readSlateBaseline(repoRoot);
    expect(reconcileSlateBaseline(repoRoot, baseline, slateCounts)).toHaveLength(0);
  });

  it("FOCUS_RING is token-tuned, so the ~90 sites that interpolate it do not trip the rule", async () => {
    const source = await readFile(join(rendererDir, "focus.ts"), "utf8");
    const declaration = source.slice(source.indexOf("export const FOCUS_RING"));
    expect(declaration).not.toContain("slate-");
    expect(declaration).toContain("focus-visible:ring-focus-ring");
  });
});

describe("the token foundation the guard exists to protect", () => {
  it("declares the tokens in one non-inline @theme block, aliases included", async () => {
    const css = await readFile(join(rendererDir, "index.css"), "utf8");
    // Only the directive counts — the file's own prose explains why `@theme
    // inline` was rejected, and that sentence must not read as a violation.
    expect(css).not.toMatch(/@theme\s+inline\s*\{/);
    expect(css.match(/@theme\s*\{/g)).toHaveLength(1);
    for (const token of [
      "--color-panel-bg:",
      "--color-panel-border:",
      "--color-chrome-top:",
      "--color-text-primary:",
      "--color-text-danger:",
      "--color-field-bg:",
      "--color-focus-ring:",
    ]) {
      expect(css).toContain(token);
    }
    // The alias layer: every shade the renderer still uses resolves to a token,
    // never to a literal colour, so deleting an alias is a one-line change.
    for (const shade of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
      expect(css).toMatch(new RegExp(`--color-slate-${shade}: var\\(--color-[a-z-]+\\);`));
    }
  });

  it("ships the consumption idiom as class-string constants, not a component library", async () => {
    const theme = await import("../src/renderer/theme.js");
    for (const constant of [
      theme.PANEL,
      theme.PANEL_STRONG,
      theme.PANEL_CHROME,
      theme.BTN_PRIMARY,
      theme.BTN_SECONDARY,
    ]) {
      expect(typeof constant).toBe("string");
      expect(constant).not.toContain("slate-");
    }
    const files = await readdir(rendererDir, { recursive: true });
    expect(files).not.toContain("Panel.tsx");
    expect(files).not.toContain("Button.tsx");
  });
});
