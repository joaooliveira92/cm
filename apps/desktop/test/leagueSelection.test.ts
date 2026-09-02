import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Effect } from "effect";
import {
  NationId,
  ScopeOptionId,
  type LeagueSelectionSnapshot,
  type NationSelectionIntentPayload,
} from "@cm-clone/contracts";
import { LEAGUE_SETUP_INDEX, blockingIssues, resolveSelection } from "@cm-clone/shared";
import {
  applyLeaguePreset,
  buildLeaguePresetIntents,
  getLeagueSelectionSnapshot,
  getLeagueSetupIndex,
  LEAGUE_PRESETS_FILE,
  LEAGUE_SNAPSHOTS_FILE,
  listLeaguePresets,
  loadSetupDraft,
  resolveLeagueSelection,
  saveLeaguePreset,
  saveSetupDraft,
  SETUP_DRAFT_FILE,
  submissionKey,
  submitLeagueSelection,
  toDomainIntents,
} from "../src/main/leagueSelection.js";

const run = <A, E>(effect: Effect.Effect<A, E>): Promise<A> => Effect.runPromise(effect);
const runExit = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.exit(effect));

const tempDir = (): Promise<string> => mkdtemp(path.join(tmpdir(), "cm-league-"));

const intent = (
  nationId: string,
  scopeOptionId?: string,
  mode: "playable" | "background" | "view_only" | "not_loaded" = "playable",
): NationSelectionIntentPayload =>
  ({
    nationId: NationId.make(nationId),
    mode,
    ...(scopeOptionId === undefined ? {} : { scopeOptionId: ScopeOptionId.make(scopeOptionId) }),
    source: "user",
  }) as NationSelectionIntentPayload;

const VALID = [intent("nation-eng", "scope-eng-top")];

describe("setup index read model (§23)", () => {
  it("exposes the catalogue with sanitized labels and no raw database values", async () => {
    const index = await run(getLeagueSetupIndex);
    expect(index.nations.length).toBeGreaterThan(0);
    for (const nation of index.nations) {
      expect(nation.name.length).toBeGreaterThan(0);
      // No control or bidi characters survive into the read model. Matching control characters
      // is the assertion here, so the rule is disabled deliberately rather than worked around.
      // oxlint-disable-next-line no-control-regex
      const unsafe = /[\u0000-\u001F\u202A-\u202E\u2066-\u2069]/;
      expect(unsafe.test(nation.name)).toBe(false);
      for (const competition of nation.competitions) {
        expect(unsafe.test(competition.name)).toBe(false);
      }
    }
  });

  it("carries the dependency edges the browser explains selections with", async () => {
    const index = await run(getLeagueSetupIndex);
    const eng = index.nations.find((nation) => nation.id === "nation-eng");
    const top = eng?.competitions.find((competition) => competition.id === "comp-eng-1");
    expect(top?.requires).toContain("comp-eng-cup");
  });
});

describe("resolution echoes the revision it was asked for (§11.5)", () => {
  it("returns the caller's revision unchanged", async () => {
    const view = await run(resolveLeagueSelection(7, VALID));
    expect(view.selectionRevision).toBe(7);
  });

  it("resolves dependencies rather than trusting the caller", async () => {
    const view = await run(resolveLeagueSelection(1, VALID));
    const cup = view.dependencies.find((d) => d.competitionId === "comp-eng-cup");
    expect(cup?.chosenDirectly).toBe(false);
  });

  it("reports a forged Nation id as a blocking issue instead of failing or accepting it", async () => {
    const view = await run(resolveLeagueSelection(1, [intent("nation-../../etc/passwd", "scope-eng-top")]));
    expect(view.issues.some((issue) => issue.code === "unknown_nation")).toBe(true);
    expect(view.selections).toHaveLength(0);
  });

  it("rejects a scope option belonging to another Nation", async () => {
    const view = await run(
      resolveLeagueSelection(1, [intent("nation-esp", "scope-eng-top")]),
    );
    expect(view.issues.some((issue) => issue.code === "scope_option_nation_mismatch")).toBe(true);
  });

  it("carries an estimate for the effective selection, dependencies included", async () => {
    const view = await run(resolveLeagueSelection(1, VALID));
    expect(view.estimate.estimatedClubCount).toBeGreaterThan(0);
    expect(view.estimate.playableCompetitionCount).toBe(1);
  });
});

describe("submission (§17)", () => {
  it("creates one immutable snapshot for a valid selection (AC-12)", async () => {
    const dir = await tempDir();
    const snapshot = await run(submitLeagueSelection(dir, VALID));
    expect(snapshot.id).toBeTruthy();
    expect(snapshot.databaseFingerprint).toBe("real-geography@1.0.0");
    expect(snapshot.selections.length).toBeGreaterThan(0);
    expect(snapshot.estimate.playableCompetitionCount).toBe(1);
  });

  it("returns the same snapshot for a duplicate activation (AC-13, §17.2)", async () => {
    const dir = await tempDir();
    const first = await run(submitLeagueSelection(dir, VALID));
    const second = await run(submitLeagueSelection(dir, VALID));
    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
  });

  it("treats a reordered but equivalent intent set as the same submission", async () => {
    const dir = await tempDir();
    const forwards = [intent("nation-eng", "scope-eng-top"), intent("nation-deu", "scope-deu-top")];
    const backwards = [...forwards].reverse();
    const first = await run(submitLeagueSelection(dir, forwards));
    const second = await run(submitLeagueSelection(dir, backwards));
    expect(second.id).toBe(first.id);
  });

  it("treats a different scope as a different submission", async () => {
    const dir = await tempDir();
    const first = await run(submitLeagueSelection(dir, VALID));
    const second = await run(
      submitLeagueSelection(dir, [intent("nation-eng", "scope-eng-pyramid")]),
    );
    expect(second.id).not.toBe(first.id);
  });

  it("ignores `source` when deciding whether two submissions are the same", () => {
    const viaClick = [intent("nation-eng", "scope-eng-top")];
    const viaPreset = [
      { ...intent("nation-eng", "scope-eng-top"), source: "preset" } as NationSelectionIntentPayload,
    ];
    expect(submissionKey(viaPreset)).toBe(submissionKey(viaClick));
  });

  it("refuses an empty selection with the blocking issues attached (AC-6, AC-7)", async () => {
    const dir = await tempDir();
    const exit = await runExit(submitLeagueSelection(dir, []));
    expect(exit._tag).toBe("Failure");
    const error = await run(submitLeagueSelection(dir, []).pipe(Effect.flip));
    expect(error._tag).toBe("InvalidLeagueSelectionError");
    expect(error.issues.some((issue) => issue.code === "no_playable_competition")).toBe(true);
  });

  it("refuses a selection whose ids do not survive revalidation, even if the client accepted it", async () => {
    const dir = await tempDir();
    const error = await run(
      submitLeagueSelection(dir, [intent("nation-eng", "scope-deu-top")]).pipe(Effect.flip),
    );
    expect(error.issues.some((issue) => issue.code === "scope_option_nation_mismatch")).toBe(true);
  });

  it("writes no snapshot file for a refused submission", async () => {
    const dir = await tempDir();
    await runExit(submitLeagueSelection(dir, []));
    const text = await readFile(path.join(dir, LEAGUE_SNAPSHOTS_FILE), "utf8").catch(() => null);
    expect(text).toBeNull();
  });

  it("reads a persisted snapshot back by id", async () => {
    const dir = await tempDir();
    const snapshot = await run(submitLeagueSelection(dir, VALID));
    const found = await run(getLeagueSelectionSnapshot(dir, snapshot.id));
    expect(found?.id).toBe(snapshot.id);
  });

  it("returns null for an id that was never issued", async () => {
    const dir = await tempDir();
    await run(submitLeagueSelection(dir, VALID));
    const found = await run(
      getLeagueSelectionSnapshot(dir, "00000000-0000-0000-0000-000000000000" as LeagueSelectionSnapshot["id"]),
    );
    expect(found).toBeNull();
  });

  it("re-resolution over the snapshot's intents reproduces the recorded selection exactly (ticket 03)", async () => {
    const dir = await tempDir();
    const snapshot = await run(submitLeagueSelection(dir, VALID));

    // The invariant generation's snapshot handling is built on: under a matching fingerprint the
    // catalogue is identical, resolution is a pure function of the intents, so the re-resolution
    // must reproduce the snapshot's stored `selections` byte for byte — a divergence is a
    // resolver defect, never a selection to migrate around.
    const resolved = resolveSelection(LEAGUE_SETUP_INDEX, toDomainIntents(snapshot.intents));
    expect(blockingIssues(resolved.issues)).toEqual([]);
    expect(resolved.selections).toEqual(
      snapshot.selections.map((row) => ({
        nationId: row.nationId,
        mode: row.mode,
        ...(row.scopeOptionId === undefined ? {} : { scopeOptionId: row.scopeOptionId }),
        playableCompetitionIds: row.playableCompetitionIds,
        backgroundCompetitionIds: row.backgroundCompetitionIds,
        viewOnlyCompetitionIds: row.viewOnlyCompetitionIds,
        dependencyCompetitionIds: row.dependencyCompetitionIds,
      })),
    );
    expect(resolved.dependencies.map((entry) => entry.competitionId).sort()).toEqual(
      snapshot.dependencies.map((entry) => entry.competitionId).sort(),
    );
    expect(LEAGUE_SETUP_INDEX.fingerprint).toBe(snapshot.databaseFingerprint);
  });
});

describe("setup draft (§18, §29)", () => {
  it("round-trips a draft", async () => {
    const dir = await tempDir();
    await run(
      saveSetupDraft(dir, {
        intents: VALID,
        searchQuery: "ara",
        regionFilterId: "region-western-europe",
        statusFilter: "selected",
      }),
    );
    const draft = await run(loadSetupDraft(dir));
    expect(draft?.intents).toHaveLength(1);
    expect(draft?.searchQuery).toBe("ara");
    expect(draft?.regionFilterId).toBe("region-western-europe");
  });

  it("reads as absent when there is no draft", async () => {
    expect(await run(loadSetupDraft(await tempDir()))).toBeNull();
  });

  it("discards a draft captured against a different database (§6.3)", async () => {
    const dir = await tempDir();
    await writeFile(
      path.join(dir, SETUP_DRAFT_FILE),
      JSON.stringify({
        databaseFingerprint: "some-other-database@9.9.9",
        savedAt: new Date().toISOString(),
        intents: VALID,
        searchQuery: "",
        regionFilterId: null,
        statusFilter: "all",
      }),
      "utf8",
    );
    expect(await run(loadSetupDraft(dir))).toBeNull();
  });

  it("reads a corrupt draft file as absent rather than failing (§30.6)", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, SETUP_DRAFT_FILE), "{not json at all", "utf8");
    expect(await run(loadSetupDraft(dir))).toBeNull();
  });

  it("drops entries the catalogue no longer contains, keeping the rest (§31.4)", async () => {
    const dir = await tempDir();
    await writeFile(
      path.join(dir, SETUP_DRAFT_FILE),
      JSON.stringify({
        databaseFingerprint: "real-geography@1.0.0",
        savedAt: new Date().toISOString(),
        intents: [...VALID, intent("nation-vanished", "scope-vanished")],
        searchQuery: "",
        regionFilterId: null,
        statusFilter: "all",
      }),
      "utf8",
    );
    const draft = await run(loadSetupDraft(dir));
    expect(draft?.intents).toHaveLength(1);
    expect(draft?.intents[0]?.nationId).toBe("nation-eng");
  });

  it("overwrites rather than appending on a second save", async () => {
    const dir = await tempDir();
    const draft = {
      intents: VALID,
      searchQuery: "",
      regionFilterId: null,
      statusFilter: "all",
    };
    await run(saveSetupDraft(dir, draft));
    await run(saveSetupDraft(dir, { ...draft, searchQuery: "second" }));
    expect((await run(loadSetupDraft(dir)))?.searchQuery).toBe("second");
  });
});

describe("presets (§13)", () => {
  it("builds a recommended configuration that is itself submittable", async () => {
    const dir = await tempDir();
    const { intents, estimate } = await run(buildLeaguePresetIntents("recommended"));
    expect(intents.length).toBeGreaterThan(0);
    expect(estimate.playableCompetitionCount).toBeGreaterThan(0);
    const snapshot = await run(submitLeagueSelection(dir, intents));
    expect(snapshot.id).toBeTruthy();
  });

  it("builds minimal and broad-world configurations that both resolve", async () => {
    for (const preset of ["minimal", "broad_world"] as const) {
      const { intents } = await run(buildLeaguePresetIntents(preset));
      const view = await run(resolveLeagueSelection(1, intents));
      expect(view.issues.filter((issue) => issue.level === "blocking")).toEqual([]);
    }
  });

  it("saves and lists a user preset", async () => {
    const dir = await tempDir();
    const saved = await run(saveLeaguePreset(dir, "My World", VALID));
    const listed = await run(listLeaguePresets(dir));
    expect(listed.map((preset) => preset.id)).toContain(saved.id);
    expect(listed[0]?.name).toBe("My World");
  });

  it("sanitizes a preset name supplied by the user", async () => {
    const dir = await tempDir();
    const saved = await run(saveLeaguePreset(dir, "Bad\u202EName", VALID));
    expect(saved.name).toBe("BadName");
  });

  it("omits presets stored against another database rather than offering them", async () => {
    const dir = await tempDir();
    await writeFile(
      path.join(dir, LEAGUE_PRESETS_FILE),
      JSON.stringify([
        {
          id: "foreign",
          name: "Foreign",
          databaseFingerprint: "other@1",
          savedAt: new Date().toISOString(),
          intents: VALID,
        },
      ]),
      "utf8",
    );
    expect(await run(listLeaguePresets(dir))).toEqual([]);
  });

  it("refuses to apply a preset from another database, changing nothing (§30.4)", async () => {
    const dir = await tempDir();
    await writeFile(
      path.join(dir, LEAGUE_PRESETS_FILE),
      JSON.stringify([
        {
          id: "foreign",
          name: "Foreign",
          databaseFingerprint: "other@1",
          savedAt: new Date().toISOString(),
          intents: VALID,
        },
      ]),
      "utf8",
    );
    const error = await run(applyLeaguePreset(dir, "foreign").pipe(Effect.flip));
    expect(error._tag).toBe("PresetFingerprintMismatchError");
    expect(error.found).toBe("other@1");
  });

  it("applies a matching preset and reports what it had to drop", async () => {
    const dir = await tempDir();
    await writeFile(
      path.join(dir, LEAGUE_PRESETS_FILE),
      JSON.stringify([
        {
          id: "mine",
          name: "Mine",
          databaseFingerprint: "real-geography@1.0.0",
          savedAt: new Date().toISOString(),
          intents: [...VALID, intent("nation-gone", "scope-gone")],
        },
      ]),
      "utf8",
    );
    const applied = await run(applyLeaguePreset(dir, "mine"));
    expect(applied.intents).toHaveLength(1);
    expect(applied.droppedNationIds).toEqual(["nation-gone"]);
  });

  it("fails rather than throwing for a preset id that does not exist", async () => {
    const dir = await tempDir();
    const error = await run(applyLeaguePreset(dir, "nope").pipe(Effect.flip));
    expect(error._tag).toBe("PresetFingerprintMismatchError");
  });
});
