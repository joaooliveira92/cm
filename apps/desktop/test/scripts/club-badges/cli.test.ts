import { describe, expect, it } from "vitest";
import { runCli } from "../../../scripts/club-badges/cli.js";
import { fixtureDump, snapshot, tempDir } from "./fixture-dump.js";

const console = () => {
  const out: Array<string> = [];
  const err: Array<string> = [];
  return { out, err, log: (line: string) => out.push(line), error: (line: string) => err.push(line) };
};

describe("import-club-badges command", () => {
  it("prints the added, replaced and removed keys and exits zero", () => {
    const source = fixtureDump({ "logos/England - Premier League/Arsenal FC.png": "arsenal" });
    const library = tempDir();
    const io = console();

    expect(runCli([source, "--adapter", "football-logos"], { ...io, libraryDir: library, referencedKeys: new Set() })).toBe(0);
    expect(io.out.join("\n")).toContain("added (1)");
    expect(io.out.join("\n")).toContain("eng/arsenal-fc");
    expect(io.out.join("\n")).toContain("replaced (0)");
    expect(io.out.join("\n")).toContain("removed (0)");
  });

  it("exits non-zero naming the offender when the import stops", () => {
    const source = fixtureDump({ "logos/Atlantis - Premier League/Poseidon FC.png": "poseidon" });
    const library = tempDir();
    const io = console();

    expect(runCli([source, "--adapter", "football-logos"], { ...io, libraryDir: library, referencedKeys: new Set() })).toBe(1);
    expect(io.err.join("\n")).toContain("Atlantis - Premier League");
    expect(snapshot(library)).toEqual({});
  });

  it("exits non-zero on an adapter it does not know, or no source directory", () => {
    const library = tempDir();
    const io = console();

    expect(runCli([tempDir(), "--adapter", "nope"], { ...io, libraryDir: library, referencedKeys: new Set() })).toBe(1);
    expect(io.err.join("\n")).toContain("nope");
    expect(runCli(["--adapter", "football-logos"], { ...io, libraryDir: library, referencedKeys: new Set() })).toBe(1);
  });
});
