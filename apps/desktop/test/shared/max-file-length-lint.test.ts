import { describe, expect, it } from "vitest";
import { mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { lintFileSet } from "../../../../scripts/effect-lint.js";

const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));

/**
 * The file-length rule (main-process decomposition).
 *
 * Thirteen tickets split every oversized file in this tree, leaving the largest splittable file at
 * 598 lines. This rule is what stops the next feature from crossing 600 silently. There is no
 * fixture on disk for it — a fixture would have to be 600 lines of padding — so these tests are the
 * only thing proving it still fires, and they do it by injecting a small threshold.
 */
describe("max-file-length", () => {
  const withTempFile = <A,>(lines: number, use: (path: string) => A): A => {
    const dir = mkdtempSync(join(tmpdir(), "max-file-length-"));
    try {
      const path = join(dir, "padded.ts");
      writeFileSync(path, `${Array.from({ length: lines }, (_, i) => `const n${i} = ${i}`).join("\n")}\n`);
      return use(path);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  };

  it("fires on a file past the limit and reports the real line count", () => {
    const violations = withTempFile(
      12,
      (path) => lintFileSet(repoRoot, [path], { maxFileLines: 10 }).treeViolations,
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]!.rule).toBe("max-file-length");
    expect(violations[0]!.message).toContain("12 lines (limit 10)");
  });

  it("stays silent exactly at the limit, so the limit is inclusive", () => {
    const violations = withTempFile(
      10,
      (path) => lintFileSet(repoRoot, [path], { maxFileLines: 10 }).treeViolations,
    );
    expect(violations).toHaveLength(0);
  });

  it("points at the allowlist, so a file that genuinely cannot be split has a documented way out", () => {
    const violations = withTempFile(
      12,
      (path) => lintFileSet(repoRoot, [path], { maxFileLines: 10 }).treeViolations,
    );
    expect(violations[0]!.message).toContain("FILE_LENGTH_EXEMPTIONS");
  });

  it("exempts db/schema.ts, which is 1110 lines and drizzle-pinned", () => {
    const schema = join(repoRoot, "apps", "desktop", "src", "main", "db", "schema.ts");
    const { treeViolations } = lintFileSet(repoRoot, [schema], { maxFileLines: 10 });
    expect(treeViolations.filter((v) => v.rule === "max-file-length")).toHaveLength(0);
  });

  it("exempts the generated migrations module, whose length is not a human decision", () => {
    const generated = join(
      repoRoot,
      "apps",
      "desktop",
      "src",
      "main",
      "db",
      "migrations.generated.ts",
    );
    const { treeViolations } = lintFileSet(repoRoot, [generated], { maxFileLines: 10 });
    expect(treeViolations.filter((v) => v.rule === "max-file-length")).toHaveLength(0);
  });

  it("every allowlisted path still exists, so the exemptions cannot rot into dead entries", () => {
    for (const path of [
      join("apps", "desktop", "src", "main", "db", "schema.ts"),
      join("apps", "desktop", "src", "main", "db", "migrations.generated.ts"),
    ]) {
      expect(statSync(join(repoRoot, path)).isFile()).toBe(true);
    }
  });

  it("the tree is under the real 600-line limit, so the gate is green on its own terms", () => {
    const walk = (root: string): string[] =>
      readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
        if (entry.name.startsWith(".")) return [];
        if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "dist-electron") {
          return [];
        }
        const full = join(root, entry.name);
        if (entry.isDirectory()) return walk(full);
        return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : [];
      });
    const files = [join(repoRoot, "packages"), join(repoRoot, "apps")].flatMap(walk);
    const { treeViolations } = lintFileSet(repoRoot, files);
    expect(treeViolations.filter((v) => v.rule === "max-file-length")).toEqual([]);
  });
});
