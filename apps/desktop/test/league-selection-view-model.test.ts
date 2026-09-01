import { describe, expect, it } from "vitest";
import {
  CareerScopeEstimateView,
  CompetitionId,
  CompetitionRow,
  EffectiveNationSelectionRow,
  LeagueSetupIndexView,
  NationId,
  NationRow,
  RegionId,
  RegionRow,
  ResolvedSelectionView,
  ScopeOptionId,
  ScopeOptionRow,
  SelectionIssueRow,
  type NationSelectionIntentPayload,
} from "@cm-clone/contracts";
import {
  blockingIssueRows,
  browserView,
  canContinueNow,
  formatBytes,
  initialState,
  needsWarningAcknowledgement,
  reduce,
  warningIssueRows,
  type LeagueSelectionCommand,
  type LeagueSelectionState,
} from "../src/renderer/leagueSelection/viewModel.js";

// ---------------------------------------------------------------------------
// Fixtures — a two-Nation catalogue, enough to exercise filters and dependencies.
// ---------------------------------------------------------------------------

const competition = (id: string, nationId: string, name: string, tier: number | null) =>
  new CompetitionRow({
    id: CompetitionId.make(id),
    nationId: NationId.make(nationId),
    name,
    kind: tier === null ? "cup" : "league",
    tier,
    requires: [],
    clubCount: 20,
    annualMatches: 380,
    playableSupported: tier !== null,
  });

const INDEX = new LeagueSetupIndexView({
  fingerprint: "test@1",
  databaseName: "Test World",
  databaseVersion: "1.0.0",
  regions: [
    new RegionRow({ id: RegionId.make("region-a"), name: "Region A" }),
    new RegionRow({ id: RegionId.make("region-b"), name: "Region B" }),
  ],
  nations: [
    new NationRow({
      id: NationId.make("nation-one"),
      code: "ENG",
      confederationId: "UEFA",
      regionId: RegionId.make("region-a"),
      name: "Nation One",
      alternativeNames: [],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: ScopeOptionId.make("scope-one-top"),
      scopeOptions: [
        new ScopeOptionRow({
          id: ScopeOptionId.make("scope-one-top"),
          nationId: NationId.make("nation-one"),
          displayName: "Top division only",
          playableCompetitionIds: [CompetitionId.make("comp-one-1")],
          backgroundCompetitionIds: [],
        }),
      ],
      competitions: [competition("comp-one-1", "nation-one", "One Premier", 1)],
    }),
    new NationRow({
      id: NationId.make("nation-two"),
      code: "ENG",
      confederationId: "UEFA",
      regionId: RegionId.make("region-b"),
      name: "Nation Two",
      alternativeNames: [],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: null,
      scopeOptions: [
        new ScopeOptionRow({
          id: ScopeOptionId.make("scope-two-top"),
          nationId: NationId.make("nation-two"),
          displayName: "Top division only",
          playableCompetitionIds: [CompetitionId.make("comp-two-1")],
          backgroundCompetitionIds: [],
        }),
      ],
      competitions: [competition("comp-two-1", "nation-two", "Two Premier", 1)],
    }),
  ],
});

const ESTIMATE = new CareerScopeEstimateView({
  selectedNationCount: 1,
  playableNationCount: 1,
  backgroundNationCount: 0,
  playableCompetitionCount: 1,
  backgroundCompetitionCount: 0,
  estimatedClubCount: 20,
  estimatedPlayerCount: 500,
  estimatedStaffCount: 160,
  estimatedMemoryBytes: 300_000_000,
  estimatedInitialSaveBytes: 12_000_000,
  simulationSpeedRating: "fast",
  confidence: "high",
});

const answer = (
  revision: number,
  options: {
    readonly issues?: readonly SelectionIssueRow[];
    readonly nationId?: string;
  } = {},
): ResolvedSelectionView =>
  new ResolvedSelectionView({
    selectionRevision: revision,
    selections: [
      new EffectiveNationSelectionRow({
        nationId: NationId.make(options.nationId ?? "nation-one"),
        mode: "playable",
        scopeOptionId: ScopeOptionId.make("scope-one-top"),
        playableCompetitionIds: [CompetitionId.make("comp-one-1")],
        backgroundCompetitionIds: [],
        viewOnlyCompetitionIds: [],
        dependencyCompetitionIds: [],
      }),
    ],
    dependencies: [],
    issues: options.issues ?? [],
    estimate: ESTIMATE,
  });

const issueRow = (
  level: "info" | "warning" | "blocking",
  message: string,
  nationId: string | null = null,
): SelectionIssueRow =>
  new SelectionIssueRow({
    code: level === "blocking" ? "no_playable_competition" : "heavy_selection",
    level,
    message,
    nationId: nationId === null ? null : NationId.make(nationId),
    competitionIds: [],
  });

const run = (
  commands: readonly LeagueSelectionCommand[],
  from: LeagueSelectionState = initialState("test@1"),
): LeagueSelectionState => commands.reduce(reduce, from);

const selectNationOne: LeagueSelectionCommand = {
  type: "SET_NATION_MODE",
  nationId: "nation-one",
  mode: "playable",
  fallbackScopeOptionId: "scope-one-top",
};

// ---------------------------------------------------------------------------

describe("filters never touch the selection (AC-8)", () => {
  it("leaves intents and revision untouched for search, region, and status", () => {
    const selected = run([selectNationOne]);
    const filtered = run(
      [
        { type: "SET_SEARCH_QUERY", query: "two" },
        { type: "SET_REGION_FILTER", regionId: "region-b" },
        { type: "SET_STATUS_FILTER", filter: "playable" },
      ],
      selected,
    );
    expect(filtered.intents).toEqual(selected.intents);
    expect(filtered.selectionRevision).toBe(selected.selectionRevision);
  });

  it("counts selected nations the filters hide, so they can be announced (§10.5)", () => {
    const state = run([
      selectNationOne,
      { type: "SET_REGION_FILTER", regionId: "region-b" },
    ]);
    const view = browserView(INDEX, state, answer(state.selectionRevision));
    expect(view.hiddenSelectedCount).toBe(1);
  });

  it("reports no hidden selections when nothing is filtered away", () => {
    const state = run([selectNationOne]);
    const view = browserView(INDEX, state, answer(state.selectionRevision));
    expect(view.hiddenSelectedCount).toBe(0);
  });
});

describe("stale estimates cannot overwrite newer ones (AC-11, §11.5)", () => {
  it("ignores an answer whose revision is behind the current selection", () => {
    const state = run([selectNationOne, selectNationOne]);
    const stale = reduce(state, { type: "ESTIMATE_UPDATED", resolved: answer(state.selectionRevision - 1) });
    expect(stale.resolved).toBeNull();
    expect(stale.estimateStatus).toBe("updating");
  });

  it("accepts an answer matching the current revision", () => {
    const state = run([selectNationOne]);
    const fresh = reduce(state, { type: "ESTIMATE_UPDATED", resolved: answer(state.selectionRevision) });
    expect(fresh.resolved?.selectionRevision).toBe(state.selectionRevision);
    expect(fresh.estimateStatus).toBe("ready");
  });

  it("keeps the last valid estimate on screen while a newer one resolves", () => {
    const ready = run([
      selectNationOne,
      { type: "ESTIMATE_UPDATED", resolved: answer(1) },
    ]);
    expect(ready.estimateStatus).toBe("ready");

    // A further change marks the estimate stale but does not discard it.
    const changing = reduce(ready, {
      type: "SET_NATION_MODE",
      nationId: "nation-two",
      mode: "playable",
      fallbackScopeOptionId: "scope-two-top",
    });
    expect(changing.estimateStatus).toBe("updating");
    expect(changing.resolved).not.toBeNull();
  });

  it("out-of-order answers settle on the newest, whichever arrives last", () => {
    // Two changes in flight; the answer for revision 1 lands *after* the answer for revision 2.
    const state = run([selectNationOne, selectNationOne]);
    const withNew = reduce(state, { type: "ESTIMATE_UPDATED", resolved: answer(2) });
    const withLateOld = reduce(withNew, { type: "ESTIMATE_UPDATED", resolved: answer(1) });
    expect(withLateOld.resolved?.selectionRevision).toBe(2);
  });

  it("an estimate failure does not corrupt the selection (§20)", () => {
    const state = run([selectNationOne]);
    const failed = reduce(state, { type: "ESTIMATE_FAILED", revision: state.selectionRevision });
    expect(failed.estimateStatus).toBe("failed");
    expect(failed.intents).toEqual(state.intents);
  });

  it("a failure for a superseded revision is ignored", () => {
    const state = run([selectNationOne, { type: "ESTIMATE_UPDATED", resolved: answer(1) }, selectNationOne]);
    const failed = reduce(state, { type: "ESTIMATE_FAILED", revision: 1 });
    expect(failed.estimateStatus).toBe("updating");
  });
});

describe("continue gating (§17, AC-12, AC-13)", () => {
  const readyState = () => run([selectNationOne, { type: "ESTIMATE_UPDATED", resolved: answer(1) }]);

  it("is live once a current, unblocked answer has arrived", () => {
    expect(canContinueNow(readyState())).toBe(true);
  });

  it("is dead while the answer on screen belongs to an older revision", () => {
    const state = reduce(readyState(), {
      type: "SET_NATION_MODE",
      nationId: "nation-two",
      mode: "playable",
      fallbackScopeOptionId: "scope-two-top",
    });
    expect(canContinueNow(state)).toBe(false);
  });

  it("is dead while a blocking issue stands", () => {
    const state = run([
      selectNationOne,
      { type: "ESTIMATE_UPDATED", resolved: answer(1, { issues: [issueRow("blocking", "no playable league")] }) },
    ]);
    expect(blockingIssueRows(state.resolved)).toHaveLength(1);
    expect(canContinueNow(state)).toBe(false);
  });

  it("is dead while a submission is already in flight", () => {
    const state = reduce(readyState(), { type: "SUBMISSION_STARTED" });
    expect(canContinueNow(state)).toBe(false);
  });

  it("a second SUBMISSION_STARTED is a no-op, so a double activation submits once", () => {
    const first = reduce(readyState(), { type: "SUBMISSION_STARTED" });
    const second = reduce(first, { type: "SUBMISSION_STARTED" });
    expect(second).toBe(first);
  });

  it("re-arms after a submission settles", () => {
    const settled = run(
      [{ type: "SUBMISSION_STARTED" }, { type: "SUBMISSION_SETTLED", notice: null }],
      readyState(),
    );
    expect(settled.submitting).toBe(false);
    expect(canContinueNow(settled)).toBe(true);
  });
});

describe("warning acknowledgement (§17.1)", () => {
  const warned = () =>
    run([
      selectNationOne,
      { type: "ESTIMATE_UPDATED", resolved: answer(1, { issues: [issueRow("warning", "large selection")] }) },
    ]);

  it("asks for an acknowledgement when a warning stands", () => {
    const state = warned();
    expect(warningIssueRows(state.resolved)).toHaveLength(1);
    expect(needsWarningAcknowledgement(state)).toBe(true);
  });

  it("stops asking once acknowledged for the current revision", () => {
    const state = reduce(warned(), { type: "ACKNOWLEDGE_WARNINGS" });
    expect(needsWarningAcknowledgement(state)).toBe(false);
  });

  it("invalidates the acknowledgement when the selection changes underneath it", () => {
    const acknowledged = reduce(warned(), { type: "ACKNOWLEDGE_WARNINGS" });
    const changed = reduce(acknowledged, {
      type: "SET_NATION_MODE",
      nationId: "nation-two",
      mode: "playable",
      fallbackScopeOptionId: "scope-two-top",
    });
    expect(changed.acknowledgedRevision).toBeNull();
    const reAnswered = reduce(changed, {
      type: "ESTIMATE_UPDATED",
      resolved: answer(changed.selectionRevision, { issues: [issueRow("warning", "large selection")] }),
    });
    expect(needsWarningAcknowledgement(reAnswered)).toBe(true);
  });

  it("warnings alone do not block Continue", () => {
    expect(canContinueNow(warned())).toBe(true);
  });
});

describe("mode and scope changes (§9.5)", () => {
  it("remembers a playable depth across a trip through Background", () => {
    const state = run([
      { type: "SET_NATION_SCOPE", nationId: "nation-one", scopeOptionId: "scope-one-deep" },
      { type: "SET_NATION_MODE", nationId: "nation-one", mode: "background", fallbackScopeOptionId: null },
    ]);
    expect(state.rememberedScopes["nation-one"]).toBe("scope-one-deep");

    const back = reduce(state, {
      type: "SET_NATION_MODE",
      nationId: "nation-one",
      mode: "playable",
      // The fallback is deliberately a different option: the remembered depth must win.
      fallbackScopeOptionId: "scope-one-top",
    });
    expect(back.intents.find((i) => i.nationId === "nation-one")?.scopeOptionId).toBe("scope-one-deep");
  });

  it("falls back to the offered scope when nothing is remembered", () => {
    const state = run([selectNationOne]);
    expect(state.intents[0]?.scopeOptionId).toBe("scope-one-top");
  });

  it("removes the Nation on Not loaded", () => {
    const state = run([
      selectNationOne,
      { type: "SET_NATION_MODE", nationId: "nation-one", mode: "not_loaded", fallbackScopeOptionId: null },
    ]);
    expect(state.intents).toEqual([]);
  });

  it("replaces rather than duplicating when the same Nation changes twice", () => {
    const state = run([
      selectNationOne,
      { type: "SET_NATION_SCOPE", nationId: "nation-one", scopeOptionId: "scope-one-deep" },
    ]);
    expect(state.intents).toHaveLength(1);
  });

  it("clears every intent but keeps remembered depths for a re-selection", () => {
    const state = run([
      selectNationOne,
      { type: "SET_NATION_MODE", nationId: "nation-one", mode: "background", fallbackScopeOptionId: null },
      { type: "CLEAR_SELECTION" },
    ]);
    expect(state.intents).toEqual([]);
    expect(state.rememberedScopes["nation-one"]).toBe("scope-one-top");
  });

  it("applying a preset replaces the whole intent set and bumps the revision", () => {
    const preset: readonly NationSelectionIntentPayload[] = [
      {
        nationId: NationId.make("nation-two"),
        mode: "playable",
        scopeOptionId: ScopeOptionId.make("scope-two-top"),
        source: "preset",
      } as NationSelectionIntentPayload,
    ];
    const state = run([selectNationOne, { type: "APPLY_INTENTS", intents: preset, notice: "applied" }]);
    expect(state.intents).toEqual(preset);
    expect(state.selectionRevision).toBe(2);
    expect(state.notice).toBe("applied");
  });
});

describe("browser view", () => {
  it("shows only expanded regions' contents and reports match counts", () => {
    const state = run([{ type: "TOGGLE_REGION", regionId: "region-a" }]);
    const view = browserView(INDEX, state, null);
    expect(view.regions.find((r) => r.regionId === "region-a")?.expanded).toBe(true);
    expect(view.regions.find((r) => r.regionId === "region-b")?.expanded).toBe(false);
    expect(view.totalMatchCount).toBe(2);
  });

  it("narrows to search matches without hiding the rest of the state", () => {
    const state = run([{ type: "SET_SEARCH_QUERY", query: "Nation Two" }]);
    const view = browserView(INDEX, state, null);
    expect(view.totalMatchCount).toBe(1);
    expect(view.regions.flatMap((r) => r.nations).map((n) => n.nation.id)).toEqual(["nation-two"]);
  });

  it("returns no regions when nothing matches, rather than an error (§30.2)", () => {
    const state = run([{ type: "SET_SEARCH_QUERY", query: "zzzz" }]);
    const view = browserView(INDEX, state, null);
    expect(view.totalMatchCount).toBe(0);
    expect(view.regions).toEqual([]);
  });
});

describe("formatting (§11.4)", () => {
  it("uses GB above a gigabyte and MB below, never false precision", () => {
    expect(formatBytes(2.1 * 1024 ** 3)).toBe("2.1 GB");
    expect(formatBytes(280 * 1024 ** 2)).toBe("280 MB");
  });
});
