import { mkdirSync, rmSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { assertBuildFresh } from "../e2e/globalSetup.js";

describe("assertBuildFresh", () => {
  const fixture = (): { srcDir: string; distDir: string; cleanup: () => void } => {
    const root = `${tmpdir()}/staleness-test-${Date.now()}-${Math.random()}`;
    const srcDir = path.join(root, "src");
    const distDir = path.join(root, "dist");
    mkdirSync(srcDir, { recursive: true });
    mkdirSync(distDir, { recursive: true });
    const cleanup = () => { rmSync(root, { recursive: true, force: true }); };
    return { srcDir, distDir, cleanup };
  };

  const touch = (file: string, mtimeMs: number) => {
    writeFileSync(file, "");
    utimesSync(file, mtimeMs / 1_000, mtimeMs / 1_000);
  };

  test("passes when dist is newer than src", () => {
    const { srcDir, distDir, cleanup } = fixture();
    try {
      touch(path.join(srcDir, "a.ts"), 100_000_000_000);
      touch(path.join(distDir, "a.js"), 200_000_000_000);
      assertBuildFresh(srcDir, distDir);
    } finally {
      cleanup();
    }
  });

  test("passes when src and dist are the same age", () => {
    const { srcDir, distDir, cleanup } = fixture();
    try {
      touch(path.join(srcDir, "a.ts"), 100_000_000_000);
      touch(path.join(distDir, "a.js"), 100_000_000_000);
      assertBuildFresh(srcDir, distDir);
    } finally {
      cleanup();
    }
  });

  test("fails when src is newer than dist", () => {
    const { srcDir, distDir, cleanup } = fixture();
    try {
      touch(path.join(srcDir, "newer.ts"), 200_000_000_000);
      touch(path.join(distDir, "older.js"), 100_000_000_000);
      expect(() => assertBuildFresh(srcDir, distDir)).toThrow();
    } finally {
      cleanup();
    }
  });

  test("fails when dist does not exist", () => {
    const { srcDir, cleanup } = fixture();
    const missing = `${tmpdir()}/nonexistent-${Date.now()}`;
    try {
      touch(path.join(srcDir, "a.ts"), 100_000_000_000);
      expect(() => assertBuildFresh(srcDir, missing)).toThrow();
    } finally {
      cleanup();
    }
  });

  test("passes when src has no files and dist is fresh", () => {
    const { srcDir, distDir, cleanup } = fixture();
    try {
      touch(path.join(distDir, "a.js"), 200_000_000_000);
      assertBuildFresh(srcDir, distDir);
    } finally {
      cleanup();
    }
  });

  test("passes when both src and dist are empty", () => {
    const { srcDir, distDir, cleanup } = fixture();
    try {
      assertBuildFresh(srcDir, distDir);
    } finally {
      cleanup();
    }
  });
});