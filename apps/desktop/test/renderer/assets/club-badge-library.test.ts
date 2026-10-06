import { CONTENT_PACKS } from "@cm-clone/shared";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLUB_BADGE_LIBRARY_DIR,
  checkLibraryIntegrity,
  writeManifest,
  type ManifestEntry,
} from "../../../scripts/club-badges/manifest.js";
import { sha256, tempDir } from "../../scripts/club-badges/fixture-dump.js";

/** The committed badge library, the manifest indexing it, and every pack's mappings into it agree. */
describe("club badge library", () => {
  it("indexes every file, hashes every entry correctly, and holds every key a content pack maps", () => {
    expect(checkLibraryIntegrity(CLUB_BADGE_LIBRARY_DIR, CONTENT_PACKS)).toEqual([]);
  });

  const entry = (key: string, contents: string): ManifestEntry => ({
    key,
    file: `${key}.png`,
    sha256: sha256(contents),
    source: `logos/${key}.png`,
    adapter: "football-logos",
  });

  const library = (files: Readonly<Record<string, string>>, manifest: ReadonlyArray<ManifestEntry>): string => {
    const dir = tempDir();
    for (const [file, contents] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      writeFileSync(path.join(dir, file), contents);
    }
    writeManifest(dir, manifest);
    return dir;
  };

  it("accepts a library whose files, manifest and pack mappings agree", () => {
    const dir = library({ "eng/arsenal.png": "arsenal" }, [entry("eng/arsenal", "arsenal")]);
    expect(checkLibraryIntegrity(dir, [{ id: "pack", clubBadges: { club_eng_1_01: "eng/arsenal" } }])).toEqual([]);
  });

  it("fails on a manifest entry with no file", () => {
    const dir = library({}, [entry("eng/arsenal", "arsenal")]);
    expect(checkLibraryIntegrity(dir, [])).toEqual([{ _tag: "MissingFile", key: "eng/arsenal", file: "eng/arsenal.png" }]);
  });

  it("fails on a file with no manifest entry", () => {
    const dir = library({ "eng/arsenal.png": "arsenal", "eng/chelsea.png": "chelsea" }, [entry("eng/arsenal", "arsenal")]);
    expect(checkLibraryIntegrity(dir, [])).toEqual([{ _tag: "UnindexedFile", file: "eng/chelsea.png" }]);
  });

  it("fails on a stale hash", () => {
    const dir = library({ "eng/arsenal.png": "a redrawn crest" }, [entry("eng/arsenal", "arsenal")]);
    expect(checkLibraryIntegrity(dir, [])).toEqual([{ _tag: "StaleHash", key: "eng/arsenal", file: "eng/arsenal.png" }]);
  });

  it("fails on an entry whose path is not <nation>/<club-slug>.png", () => {
    const dir = library({ "eng/premier-league/arsenal.png": "arsenal" }, [
      { ...entry("eng/premier-league/arsenal", "arsenal") },
    ]);
    expect(checkLibraryIntegrity(dir, [])).toEqual([
      { _tag: "MalformedEntry", key: "eng/premier-league/arsenal", file: "eng/premier-league/arsenal.png" },
    ]);
  });

  it("fails on a pack mapping a club to a key the manifest lacks", () => {
    const dir = library({ "eng/arsenal.png": "arsenal" }, [entry("eng/arsenal", "arsenal")]);
    expect(
      checkLibraryIntegrity(dir, [{ id: "english", clubBadges: { club_eng_1_01: "eng/arsenal", club_eng_1_02: "eng/chelsea" } }]),
    ).toEqual([{ _tag: "UnknownPackKey", packId: "english", clubId: "club_eng_1_02", key: "eng/chelsea" }]);
  });
});
