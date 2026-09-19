import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach } from "vitest";

const created: Array<string> = [];

afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A fresh empty directory, removed after the current test. */
export const tempDir = (): string => {
  const dir = mkdtempSync(path.join(tmpdir(), "club-badges-"));
  created.push(dir);
  return dir;
};

/**
 * A small dump on disk: relative path -> file contents. The importer only copies and hashes bytes, so
 * a short string stands in for a PNG and makes "which file won" readable in an assertion.
 */
export const fixtureDump = (files: Readonly<Record<string, string>>): string => {
  const root = tempDir();
  for (const [file, contents] of Object.entries(files)) {
    const full = path.join(root, file);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, contents);
  }
  return root;
};

/** Every file under `dir` with its contents: the observable state an import leaves behind. */
export const snapshot = (dir: string): Record<string, string> =>
  Object.fromEntries(
    readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter((entry) => statSync(path.join(dir, entry)).isFile())
      .map((entry) => [entry.split(path.sep).join("/"), readFileSync(path.join(dir, entry), "utf8")] as const)
      .sort(([a], [b]) => a.localeCompare(b)),
  );

export const sha256 = (contents: string): string => createHash("sha256").update(contents).digest("hex");
