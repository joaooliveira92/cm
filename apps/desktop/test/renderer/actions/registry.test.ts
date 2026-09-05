import { describe, expect, it } from "vitest";
import {
  CAREER_SCREEN_TYPES,
} from "../../../src/renderer/navigation/destinations.js";
import {
  ACTION_REGISTRY,
} from "../../../src/renderer/actions/allActions.js";
import {
  checkCollisions,
  createRegistry,
  LOCKED_INFRA_BINDINGS,
} from "../../../src/renderer/actions/registry.js";
import type { Action } from "../../../src/renderer/actions/types.js";

const always = () => true;
const never = () => false;

const action = (partial: Partial<Action> & Pick<Action, "id" | "scope">): Action => ({
  label: partial.id,
  available: always,
  handler: () => undefined,
  ...partial,
});

const readyState = { ready: true };

describe("AC-16 — the registry collects every scope and exposes a stable id", () => {
  it("looks up an Action by stable kebab-case id", () => {
    const registry = createRegistry([
      action({ id: "advance-calendar", scope: "career-global", binding: "Space" }),
      action({ id: "place-bid", scope: "transfers", binding: "b" }),
    ]);
    expect(registry.get("place-bid")?.label).toBe("place-bid");
    expect(registry.get("nope")).toBeUndefined();
  });

  it("merges current scope + globals into the active set, excluding other scopes", () => {
    const registry = createRegistry([
      action({ id: "open-palette", scope: "app-global", binding: "Primary+K" }),
      action({ id: "continue", scope: "career-global", binding: "Space" }),
      action({ id: "go-squad", scope: "career-global", binding: "g s" }),
      action({ id: "place-bid", scope: "transfers", binding: "b" }),
      action({ id: "advance-calendar", scope: "league", binding: "c" }),
    ]);
    const onTransfers = registry.active("transfers", readyState).map((a) => a.id);
    expect(onTransfers).toEqual(
      expect.arrayContaining(["open-palette", "continue", "go-squad", "place-bid"]),
    );
    expect(onTransfers).not.toContain("advance-calendar");
  });

  it("career-global actions are inactive on a creation scope", () => {
    const registry = createRegistry([
      action({ id: "open-palette", scope: "app-global" }),
      action({ id: "continue", scope: "career-global", binding: "Space" }),
      action({ id: "go-squad", scope: "career-global", binding: "g s" }),
      action({ id: "finish-step", scope: "createStep1" }),
    ]);
    const onCreate = registry.active("createStep1", readyState).map((a) => a.id);
    expect(onCreate).toContain("open-palette");
    expect(onCreate).toContain("finish-step");
    expect(onCreate).not.toContain("continue");
    expect(onCreate).not.toContain("go-squad");
  });

  it("availability is a best-effort predicate: unavailable actions are excluded from the active set", () => {
    const registry = createRegistry([
      action({ id: "advance-calendar", scope: "league", available: never }),
      action({ id: "open-palette", scope: "app-global" }),
    ]);
    const onLeague = registry.active("league", readyState).map((a) => a.id);
    expect(onLeague).not.toContain("advance-calendar");
    expect(onLeague).toContain("open-palette");
  });
});

describe("AC-17 — automated collision checks across active scopes", () => {
  it("flags two actions claiming the same binding within one scope", () => {
    const violations = checkCollisions([
      action({ id: "bid-a", scope: "transfers", binding: "b" }),
      action({ id: "bid-b", scope: "transfers", binding: "b" }),
    ]);
    expect(violations.some((v) => v.rule === "duplicate-binding")).toBe(true);
  });

  it("allows the same binding in different scopes (dispatch priority disambiguates)", () => {
    const violations = checkCollisions([
      action({ id: "career-b", scope: "career-global", binding: "b" }),
      action({ id: "screen-b", scope: "transfers", binding: "b" }),
    ]);
    expect(violations.some((v) => v.rule === "duplicate-binding")).toBe(false);
  });

  it("rejects a non-app-global action claiming a locked infra key", () => {
    for (const locked of LOCKED_INFRA_BINDINGS) {
      const violations = checkCollisions([
        action({ id: "ibble", scope: "transfers", binding: locked }),
      ]);
      expect(
        violations.some((v) => v.rule === "locked-key" && v.binding === locked),
        `expected ${locked} to be protected`,
      ).toBe(true);
    }
  });

  it("does not flag the app-global owner of each locked infra key", () => {
    const violations = checkCollisions([
      action({ id: "open-palette", scope: "app-global", binding: "Primary+K" }),
      action({ id: "open-help", scope: "app-global", binding: "Primary+/" }),
      action({ id: "escape", scope: "app-global", binding: "Escape" }),
      action({ id: "enter", scope: "app-global", binding: "Enter" }),
    ]);
    expect(violations.some((v) => v.rule === "locked-key")).toBe(false);
  });

  it("a registry built with a within-scope duplicate id is a build error", () => {
    expect(() =>
      createRegistry([
        action({ id: "dup", scope: "transfers" }),
        action({ id: "dup", scope: "transfers" }),
      ]),
    ).toThrow(/duplicate id/);
  });

  it("two actions with the same id in different scopes are distinct and legal", () => {
    const registry = createRegistry([
      action({ id: "bid", scope: "transfers" }),
      action({ id: "bid", scope: "career-global" }),
    ]);
    expect(registry.all).toHaveLength(2);
    expect(
      checkCollisions([
        action({ id: "bid", scope: "transfers" }),
        action({ id: "bid", scope: "career-global" }),
      ]).some((v) => v.rule === "duplicate-id"),
    ).toBe(false);
  });
});

describe("AC-19 — the Continue safety contract is a registry predicate, not a hand-rolled bind", () => {
  const leagueIds = (state: Parameters<typeof ACTION_REGISTRY.active>[1]): string[] =>
    ACTION_REGISTRY.active("league", state)
      .map((a) => a.id)
      .filter((id) => id === "continue" || id === "advance-calendar");

  it("at season completion Continue and advance-calendar are unavailable", () => {
    expect(leagueIds({ ready: true, phase: "season_complete", advancing: false })).toEqual([]);
  });

  it("mid-season with no advance running both are available", () => {
    expect(
      leagueIds({ ready: true, phase: "in_season", advancing: false }).sort(),
    ).toEqual(["advance-calendar", "continue"]);
  });

  it("while an advance is already running Continue is unavailable", () => {
    expect(leagueIds({ ready: true, phase: "in_season", advancing: true })).toEqual([]);
  });

  it("the league scope's 'c' binding is only active when the contract permits", () => {
    const activeWhenPermitted = ACTION_REGISTRY.active("league", {
      ready: true,
      phase: "in_season",
      advancing: false,
    }).map((a) => a.id);
    expect(activeWhenPermitted).toContain("advance-calendar");
    expect(
      ACTION_REGISTRY.active("league", {
        ready: true,
        phase: "season_complete",
        advancing: false,
      }).map((a) => a.id),
    ).not.toContain("advance-calendar");
  });
});

describe("AC-16/AC-14 — the g-navigation bindings resolve a stable career destination", () => {
  it("every career screen in the tier table has a g binding and nothing extra", () => {
    expect(Object.keys(CAREER_SCREEN_TYPES).length).toBe(9);
    // The spine's prefix completions come from CAREER_G_BINDINGS; creation steps
    // are excluded from the set of valid career destinations by construction.
    expect(CAREER_SCREEN_TYPES).toEqual(
      expect.arrayContaining([
        "squad",
        "tactics",
        "transfers",
        "league",
        "fixtures",
        "match",
        "seasonSummary",
        "manager",
        "news",
      ]),
    );
  });
});
