import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { footballLogosAdapter } from "../../../scripts/club-badges/football-logos.js";
import { describeFailure, importClubBadges, type ImportOutcome } from "../../../scripts/club-badges/import.js";
import { readManifest, writeManifest } from "../../../scripts/club-badges/manifest.js";
import { fixtureDump, sha256, snapshot, tempDir } from "./fixture-dump.js";

/** The badge files an import left in the library, without the manifest beside them. */
const badges = (library: string): Record<string, string> =>
  Object.fromEntries(Object.entries(snapshot(library)).filter(([file]) => file !== "manifest.json"));

const run = (
  sourceDir: string,
  libraryDir: string,
  options: { readonly overrides?: Readonly<Record<string, string>>; readonly referencedKeys?: ReadonlyArray<string> } = {},
): ImportOutcome =>
  importClubBadges({
    sourceDir,
    libraryDir,
    adapter: footballLogosAdapter({ overrides: options.overrides ?? {} }),
    referencedKeys: new Set(options.referencedKeys ?? []),
  });

const failureMessage = (outcome: ImportOutcome): string => {
  if (outcome._tag !== "Failed") throw new Error(`expected the import to fail, got ${JSON.stringify(outcome)}`);
  return describeFailure(outcome.failure);
};

const noChanges = { added: [], replaced: [], removed: [] };

describe("importing the football-logos layout", () => {
  it("files one badge per club under its nation, with no league or season in any path", () => {
    const source = fixtureDump({
      "logos/England - Premier League/Brighton & Hove Albion.png": "brighton",
      "logos/Germany - Bundesliga/Bor. M'gladbach.png": "gladbach",
      "logos/Türkiye - Süper Lig/Göztepe.png": "goztepe",
    });
    const library = tempDir();

    expect(run(source, library)).toEqual({
      _tag: "Imported",
      report: { added: ["deu/bor-m-gladbach", "eng/brighton-hove-albion", "tur/goztepe"], replaced: [], removed: [] },
    });
    expect(snapshot(library)["manifest.json"]).toBeDefined();
    expect(badges(library)).toEqual({
      "deu/bor-m-gladbach.png": "gladbach",
      "eng/brighton-hove-albion.png": "brighton",
      "tur/goztepe.png": "goztepe",
    });
    expect(readManifest(library)).toEqual([
      {
        key: "deu/bor-m-gladbach",
        file: "deu/bor-m-gladbach.png",
        sha256: sha256("gladbach"),
        source: "logos/Germany - Bundesliga/Bor. M'gladbach.png",
        adapter: "football-logos",
      },
      {
        key: "eng/brighton-hove-albion",
        file: "eng/brighton-hove-albion.png",
        sha256: sha256("brighton"),
        source: "logos/England - Premier League/Brighton & Hove Albion.png",
        adapter: "football-logos",
      },
      {
        key: "tur/goztepe",
        file: "tur/goztepe.png",
        sha256: sha256("goztepe"),
        source: "logos/Türkiye - Süper Lig/Göztepe.png",
        adapter: "football-logos",
      },
    ]);
  });

  it("keeps the newest file per club: the current season first, then older seasons newest first", () => {
    const source = fixtureDump({
      "history/2021-22/England - Premier League/Burnley.png": "burnley 2021-22",
      "history/2025-26/England - Premier League/Burnley.png": "burnley 2025-26",
      "history/2023-24/England - Premier League/Burnley.png": "burnley 2023-24",
      "history/2025-26/England - Premier League/Arsenal.png": "arsenal 2025-26",
      "logos/England - Premier League/Arsenal.png": "arsenal current",
      // A sponsor renames the league folder between seasons; the club is still one Spanish club.
      "history/2022-23/Spain - La Liga Santander/Sevilla FC.png": "sevilla 2022-23",
      "logos/Spain - LaLiga/Sevilla FC.png": "sevilla current",
    });
    const library = tempDir();

    expect(run(source, library)._tag).toBe("Imported");
    expect(badges(library)).toEqual({
      "eng/arsenal.png": "arsenal current",
      "eng/burnley.png": "burnley 2025-26",
      "esp/sevilla-fc.png": "sevilla current",
    });
    expect(readManifest(library).find((entry) => entry.key === "eng/burnley")?.source).toBe(
      "history/2025-26/England - Premier League/Burnley.png",
    );
  });

  it("stops on a league folder whose country it cannot place, naming the folder, and writes nothing", () => {
    const source = fixtureDump({
      "logos/England - Premier League/Arsenal.png": "arsenal",
      "history/2023-24/Atlantis - Premier League/Poseidon FC.png": "poseidon",
    });
    const library = tempDir();

    expect(failureMessage(run(source, library))).toContain("Atlantis - Premier League");
    expect(snapshot(library)).toEqual({});
  });

  it("stops when two differently named clubs in one country share a key, and writes nothing", () => {
    const source = fixtureDump({
      "logos/Italy - Serie A/Inter & Milan.png": "one club",
      "logos/Italy - Serie A/Inter Milan.png": "another club",
    });
    const library = tempDir();

    const message = failureMessage(run(source, library));
    expect(message).toContain("ita/inter-milan");
    expect(message).toContain("Inter & Milan");
    expect(message).toContain("Inter Milan");
    expect(snapshot(library)).toEqual({});
  });

  it("gives colliding clubs separate keys through the override table", () => {
    const source = fixtureDump({
      "logos/Italy - Serie A/Inter & Milan.png": "one club",
      "logos/Italy - Serie A/Inter Milan.png": "another club",
      // Same slug in another country is a different namespace, never a collision.
      "logos/Spain - LaLiga/Inter Milan.png": "a spanish club",
    });
    const library = tempDir();

    expect(run(source, library, { overrides: { "ita/Inter & Milan": "inter-and-milan" } })).toEqual({
      _tag: "Imported",
      report: { added: ["esp/inter-milan", "ita/inter-and-milan", "ita/inter-milan"], replaced: [], removed: [] },
    });
    expect(badges(library)).toEqual({
      "esp/inter-milan.png": "a spanish club",
      "ita/inter-and-milan.png": "one club",
      "ita/inter-milan.png": "another club",
    });
  });

  it("merges two spellings of one club through the override table, keeping the newest file", () => {
    const source = fixtureDump({
      "logos/England - Premier League/Arsenal FC.png": "arsenal current",
      "history/2021-22/England - Premier League/Arsenal.png": "arsenal 2021-22",
    });
    const library = tempDir();

    run(source, library, { overrides: { "eng/Arsenal": "arsenal-fc" } });
    expect(badges(library)).toEqual({ "eng/arsenal-fc.png": "arsenal current" });
  });

  it("changes nothing when run a second time on the same dump", () => {
    const source = fixtureDump({
      "logos/England - Premier League/Arsenal.png": "arsenal",
      "history/2024-25/France - Ligue 1/Stade Reims.png": "reims",
    });
    const library = tempDir();
    run(source, library);
    const afterFirstRun = snapshot(library);

    expect(run(source, library)).toEqual({ _tag: "Imported", report: noChanges });
    expect(snapshot(library)).toEqual(afterFirstRun);
  });

  it("reports a changed crest as replaced and a club the dump no longer has as removed", () => {
    const library = tempDir();
    run(
      fixtureDump({
        "logos/England - Premier League/Arsenal.png": "old crest",
        "logos/England - Premier League/Luton Town.png": "luton",
      }),
      library,
    );

    const next = fixtureDump({ "logos/England - Premier League/Arsenal.png": "new crest" });
    expect(run(next, library)).toEqual({
      _tag: "Imported",
      report: { added: [], replaced: ["eng/arsenal"], removed: ["eng/luton-town"] },
    });
    expect(badges(library)).toEqual({ "eng/arsenal.png": "new crest" });
    expect(readManifest(library).map((entry) => entry.key)).toEqual(["eng/arsenal"]);
  });

  it("refuses to remove a key a content pack references, and leaves the library as it was", () => {
    const library = tempDir();
    run(
      fixtureDump({
        "logos/England - Premier League/Arsenal.png": "arsenal",
        "logos/England - Premier League/Luton Town.png": "luton",
      }),
      library,
    );
    const before = snapshot(library);

    const partial = fixtureDump({ "logos/England - Premier League/Arsenal.png": "arsenal" });
    expect(failureMessage(run(partial, library, { referencedKeys: ["eng/luton-town"] }))).toContain("eng/luton-town");
    expect(snapshot(library)).toEqual(before);
  });

  it("leaves badges another adapter imported alone", () => {
    const library = tempDir();
    mkdirSync(path.join(library, "bra"));
    writeFileSync(path.join(library, "bra", "flamengo.png"), "flamengo");
    writeManifest(library, [
      {
        key: "bra/flamengo",
        file: "bra/flamengo.png",
        sha256: sha256("flamengo"),
        source: "serie-a/Flamengo.png",
        adapter: "brazil",
      },
    ]);

    const source = fixtureDump({ "logos/England - Premier League/Arsenal.png": "arsenal" });
    expect(run(source, library)).toEqual({
      _tag: "Imported",
      report: { added: ["eng/arsenal"], replaced: [], removed: [] },
    });
    expect(readManifest(library).map((entry) => entry.key)).toEqual(["bra/flamengo", "eng/arsenal"]);
    expect(snapshot(library)["bra/flamengo.png"]).toBe("flamengo");
  });

  it("stops rather than take over a key another adapter owns", () => {
    const library = tempDir();
    mkdirSync(path.join(library, "eng"));
    writeFileSync(path.join(library, "eng", "arsenal.png"), "elsewhere");
    writeManifest(library, [
      { key: "eng/arsenal", file: "eng/arsenal.png", sha256: sha256("elsewhere"), source: "x/Arsenal.png", adapter: "other" },
    ]);
    const before = snapshot(library);

    const source = fixtureDump({ "logos/England - Premier League/Arsenal.png": "arsenal" });
    const message = failureMessage(run(source, library));
    expect(message).toContain("eng/arsenal");
    expect(message).toContain("other");
    expect(snapshot(library)).toEqual(before);
  });

  it("stops on a source that is not in the football-logos layout", () => {
    const source = fixtureDump({ "Arsenal.png": "arsenal" });
    const library = tempDir();

    expect(failureMessage(run(source, library))).toContain("logos");
    expect(snapshot(library)).toEqual({});
  });
});
