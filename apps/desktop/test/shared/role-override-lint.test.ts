import { describe, expect, it } from "vitest";
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
