import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import type { LeagueSetupIndexView } from "@cm-clone/contracts";
import { resolveLeagueSelection, getLeagueSetupIndex } from "../src/main/leagueSelection.js";
import { applyIntent, initialState } from "../src/renderer/activeLeagues/state.js";
import { deriveActiveLeaguesView } from "../src/renderer/activeLeagues/atoms.js";
import { toDomainIndex } from "../src/renderer/activeLeagues/adapters.js";
import type { ActiveLeaguesSetupState } from "../src/renderer/activeLeagues/types.js";

/**
 * The reducer's checked-value edges, run against the real catalogue through the same
 * main-process adapters the screen reads. Every impossible request is a no-op or a refused
 * value — never a throw — and every intents change bumps the revision so the resolve edge
 * knows the previous answer is stale.
 */

const indexView = (await Effect.runPromise(getLeagueSetupIndex)) as LeagueSetupIndexView;
const domainIndex = toDomainIndex(indexView);

const setup = (intents: readonly unknown[]): ActiveLeaguesSetupState =>
  initialState({ intents: intents as never });

const resolveView = async (state: ActiveLeaguesSetupState) => {
  const resolved = await Effect.runPromise(
    resolveLeagueSelection(state.revision, state.intents),
  );
  return deriveActiveLeaguesView(indexView, state, { _tag: "ready", resolved });
};

describe("addActiveLeague", () => {
  it("adds the owning Nation at the narrowest scope that carries the league playable", () => {
    const state = applyIntent(domainIndex, setup([]), {
      type: "addActiveLeague",
      leagueId: "comp-fra-2",
    });
    expect(state.intents).toEqual([
      { nationId: "nation-fra", mode: "playable", scopeOptionId: "scope-fra-two", source: "user" },
    ]);
  });

  it("adds a league no scope can make playable at background, never as fabricated full", () => {
    const state = applyIntent(domainIndex, setup([]), {
      type: "addActiveLeague",
      leagueId: "comp-and-1",
    });
    expect(state.intents).toEqual([{ nationId: "nation-and", mode: "background", source: "user" }]);
  });

  it("is a checked no-op for an unknown league id", () => {
    const state = setup([]);
    expect(applyIntent(domainIndex, state, { type: "addActiveLeague", leagueId: "nope" })).toBe(
      state,
    );
  });
});

describe("changeSimulationDepth", () => {
  it("moves a league to a shallower depth by retargeting its Nation's mode", () => {
    const state = applyIntent(
      domainIndex,
      setup([{ nationId: "nation-eng", mode: "playable", scopeOptionId: "scope-eng-two", source: "user" }]),
      { type: "changeSimulationDepth", leagueId: "comp-eng-1", simulationDepth: "standard" },
    );
    expect(state.intents).toEqual([{ nationId: "nation-eng", mode: "background", source: "user" }]);
    expect(state.revision).toBe(1);
  });

  it("picks the narrowest scope that can carry the league playable", () => {
    const state = applyIntent(
      domainIndex,
      setup([{ nationId: "nation-eng", mode: "background", source: "preset" }]),
      { type: "changeSimulationDepth", leagueId: "comp-eng-2", simulationDepth: "full" },
    );
    // The two-division scope, not the top-only one the engine would otherwise default to.
    expect(state.intents).toEqual([
      { nationId: "nation-eng", mode: "playable", scopeOptionId: "scope-eng-two", source: "user" },
    ]);
  });

  it("is a checked no-op when no scope option can make the league playable", () => {
    const state = setup([{ nationId: "nation-and", mode: "background", source: "user" }]);
    const next = applyIntent(domainIndex, state, {
      type: "changeSimulationDepth",
      leagueId: "comp-and-1",
      simulationDepth: "full",
    });
    // Andorra has no scope option that can carry its league playable — the request is refused,
    // state identical (same reference), nothing thrown.
    expect(next).toBe(state);
  });

  it("is a checked no-op for an unknown league id", () => {
    const state = setup([]);
    const next = applyIntent(domainIndex, state, {
      type: "changeSimulationDepth",
      leagueId: "no-such-league",
      simulationDepth: "full",
    });
    expect(next).toBe(state);
  });

  it("refuses to re-depth a dependency-capped competition (the cup its scope requires)", () => {
    const state = setup([
      { nationId: "nation-eng", mode: "playable", scopeOptionId: "scope-eng-two", source: "user" },
    ]);
    const next = applyIntent(domainIndex, state, {
      type: "changeSimulationDepth",
      leagueId: "comp-eng-cup",
      simulationDepth: "standard",
    });
    // The cup is active only as England's dependency — the reducer refuses, so nothing short of
    // a caller bug can demote a required competition.
    expect(next).toBe(state);
  });
});

describe("removeActiveLeague", () => {
  it("takes the owning Nation's selection out of the career, leaving others alone", () => {
    const state = applyIntent(
      domainIndex,
      setup([
        { nationId: "nation-eng", mode: "playable", scopeOptionId: "scope-eng-two", source: "user" },
        { nationId: "nation-esp", mode: "playable", scopeOptionId: "scope-esp-top", source: "user" },
      ]),
      { type: "removeActiveLeague", leagueId: "comp-eng-2" },
    );
    expect(state.intents).toEqual([
      { nationId: "nation-esp", mode: "playable", scopeOptionId: "scope-esp-top", source: "user" },
    ]);
  });

  it("is a checked no-op for an unknown league id", () => {
    const state = setup([]);
    expect(applyIntent(domainIndex, state, { type: "removeActiveLeague", leagueId: "nope" })).toBe(
      state,
    );
  });
});

describe("applySetupPreset", () => {
  it("replaces the intents wholesale and bumps the revision", () => {
    const state = applyIntent(
      domainIndex,
      setup([{ nationId: "nation-fra", mode: "background", source: "user" }]),
      {
        type: "applySetupPreset",
        intents: [{ nationId: "nation-bra", mode: "background", source: "preset" }],
        notice: "Preset applied",
      },
    );
    expect(state.intents).toEqual([{ nationId: "nation-bra", mode: "background", source: "preset" }]);
    expect(state.notice).toBe("Preset applied");
    expect(state.revision).toBe(1);
  });
});

describe("changeAdvancedOption", () => {
  it("stores the requested pair and lets validation report the conflict as a value", async () => {
    const base = setup([
      { nationId: "nation-eng", mode: "playable", scopeOptionId: "scope-eng-two", source: "user" },
    ]);
    const first = applyIntent(domainIndex, base, {
      type: "changeAdvancedOption",
      key: "rosterGenerationDetail",
      value: "full",
    });

    // The engine's own rule: a full roster conflicts with quick match simulation. An explicit
    // intent is never silently rewritten, so the state keeps the requested pair and the
    // validation atoms surface the checked blocking issue — Continue gates on it, no throw.
    const next = applyIntent(domainIndex, first, {
      type: "changeAdvancedOption",
      key: "matchSimulationDetail",
      value: "quick",
    });
    expect(next.advancedOptions).toMatchObject({
      rosterGenerationDetail: "full",
      matchSimulationDetail: "quick",
    });

    const view = await resolveView(next);
    expect(view.validation.valid).toBe(false);
    expect(view.validation.blockingMessages.join(" ")).toMatch(/contradict|conflict/i);
  });
});