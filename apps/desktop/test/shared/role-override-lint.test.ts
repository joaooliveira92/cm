import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { lintFileSet } from "../../../../scripts/effect-lint.js";

const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const fixture = join(repoRoot, "scripts", "effect-lint-fixtures", "no-role-override.tsx");

const roleOverrideMessages = (): string[] =>
  lintFileSet(repoRoot, [fixture])
    .fixtureBoundaries[0]!.violations.filter((v) => v.rule === "no-role-override")
    .map((v) => v.message);

/**
 * The role-override guard. A primitive in `components/ui` owns the role for its
 * kind of text; a screen passing another role in `className` puts that primitive
 * at a second size on one screen.
 */
describe("no-role-override guard", () => {
  it("sees an override in an attribute, a cn() call, a variant, and a hoisted constant", () => {
    const messages = roleOverrideMessages();
    expect(messages).toHaveLength(4);
    for (const [role, primitive] of [
      ["text-body", "Button"],
      ["text-caption", "TableCell"],
      ["sm:text-heading", "TabsTrigger"],
      ["text-body", "KeyValueKey"],
    ] as const) {
      expect(
        messages.some((m) => m.includes(role.replace("sm:", "")) && m.includes(`<${primitive}>`)),
      ).toBe(true);
    }
  });

  it("leaves colours, plain elements, and KeyValueValue figures alone", () => {
    const messages = roleOverrideMessages().join("\n");
    expect(messages).not.toContain("text-text-secondary");
    expect(messages).not.toContain("<Badge>");
    expect(messages).not.toContain("<KeyValueValue>");
    expect(messages).not.toContain("text-figure");
  });
});

/**
 * A class constant imported from a sibling module is where the three duplicated select paints
 * hid, so the guard follows relative imports. These cases need two files that import each other,
 * which a single fixture cannot be, so they are written to a scratch renderer tree.
 */
describe("no-role-override across modules", () => {
  let root: string | undefined;

  afterEach(() => {
    if (root !== undefined) rmSync(root, { force: true, recursive: true });
    root = undefined;
  });

  const lintRendererFiles = (files: Readonly<Record<string, string>>): string[] => {
    root = mkdtempSync(join(tmpdir(), "role-override-"));
    const paths = Object.entries(files).map(([relativePath, source]) => {
      const path = join(root!, "apps", "desktop", "src", "renderer", relativePath);
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(path, source);
      return path;
    });
    return lintFileSet(root, paths)
      .treeViolations.filter((v) => v.rule === "no-role-override")
      .map((v) => v.message);
  };

  it("follows a constant imported by name, including a renamed import", () => {
    const messages = lintRendererFiles({
      "screen/styles.ts": 'const BASE = "px-2 text-body";\nexport const TRIGGER_CLASS = `mt-1 ${BASE}`;\n',
      "screen/Screen.tsx": [
        'import { TRIGGER_CLASS, TRIGGER_CLASS as Renamed } from "./styles.js";',
        "export const A = () => <SelectTrigger className={TRIGGER_CLASS} />;",
        "export const B = () => <Button className={Renamed}>Go</Button>;",
      ].join("\n"),
    });
    expect(messages).toHaveLength(2);
    expect(messages.some((m) => m.includes("<SelectTrigger>"))).toBe(true);
    expect(messages.some((m) => m.includes("<Button>"))).toBe(true);
  });

  it("does not chase package imports or a local name that shadows nothing", () => {
    const messages = lintRendererFiles({
      "screen/Screen.tsx": [
        'import { PACKAGE_CLASS } from "@cm-clone/shared";',
        "export const A = () => <Button className={PACKAGE_CLASS}>Go</Button>;",
        "export const B = ({ c }: { c: string }) => <Button className={c}>Go</Button>;",
      ].join("\n"),
    });
    expect(messages).toEqual([]);
  });

  it("honours the recorded exemption for the squad Sort trigger, and only for that primitive", () => {
    const messages = lintRendererFiles({
      "squad/SquadSortSelect.tsx": [
        'export const A = () => <SelectTrigger className="text-label" />;',
        'export const B = () => <Button className="text-body">Go</Button>;',
      ].join("\n"),
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("<Button>");
  });
});
