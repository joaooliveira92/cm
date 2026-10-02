import { describe, expect, it } from "vitest";
import { DEFAULT_SET_PIECE_ROLES, type SetPieceRoles } from "@cm-clone/shared";
import { simulateMatch } from "../../src/match/simulate/index.js";
import { applyCommand, initTeamState } from "../../src/match/simulate/teamState.js";
import { resolveTeamTactics } from "../../src/match/tactical-modifiers.js";
import { toMatchTactic, type MatchTactic, type MatchTeamSetup } from "../../src/match/types.js";
import { buildTeam, clubId, withNamedBench } from "./fixtures.js";

/** set-piece-roles 01: each slot's set-piece roles reach the engine, and all-default roles change nothing. */

const GO_FORWARD: SetPieceRoles = { ...DEFAULT_SET_PIECE_ROLES, attackCorner: "challengeGoalkeeper" };

/** `setup` with the roles of slot `index` set. */
const withRoles = (setup: MatchTeamSetup, index: number, roles: SetPieceRoles): MatchTeamSetup => ({
  ...setup,
  tactic: {
    ...setup.tactic,
    slots: setup.tactic.slots.map((slot, at) => (at === index ? { ...slot, setPieceRoles: roles } : slot)),
  },
});

describe("set-piece roles reach the engine", () => {
  it("are carried by toMatchTactic from a stored tactic's slots", () => {
    const tactic = toMatchTactic({
      slots: [{ cell: { row: "F", column: "C" }, setPieceRoles: GO_FORWARD }, { cell: { row: "GK", column: "C" } }],
      assignments: ["p1" as never, "p2" as never],
      bench: [],
      team: buildTeam(clubId("home"), 1).setup.tactic.team,
    });
    expect(tactic.slots[0]!.setPieceRoles).toEqual(GO_FORWARD);
    expect(tactic.slots[1]!.setPieceRoles).toBeUndefined();
  });

  it("are on every resolved slot, all default when a tactic never set them", () => {
    const setup = withRoles(buildTeam(clubId("home"), 1).setup, 3, GO_FORWARD);
    const team = initTeamState(setup, 1);
    expect(team.resolved.slots[3]!.setPieceRoles).toEqual(GO_FORWARD);
    expect(team.resolved.slots[4]!.setPieceRoles).toEqual(DEFAULT_SET_PIECE_ROLES);
  });

  it("stay with the slot when a substitute comes on, and follow a live tactics change", () => {
    const setup = withRoles(withNamedBench(buildTeam(clubId("home"), 1).setup), 3, GO_FORWARD);
    const team = initTeamState(setup, 1);
    const outPlayerId = team.resolved.slots[3]!.playerId;
    const inPlayerId = setup.tactic.bench[0]!;
    applyCommand(team, { _tag: "MakeSubstitution", clubId: setup.clubId, outPlayerId, inPlayerId }, 60, 2, false);
    expect(team.resolved.slots[3]).toMatchObject({ playerId: inPlayerId, setPieceRoles: GO_FORWARD });

    const changed: MatchTactic = withRoles(setup, 4, GO_FORWARD).tactic;
    applyCommand(team, { _tag: "ChangeTactics", clubId: setup.clubId, tactic: changed }, 70, 2, false);
    expect(team.resolved.slots[4]!.setPieceRoles).toEqual(GO_FORWARD);
  });

  it("change nothing when every role is default", () => {
    for (const seed of [3, 11, 42]) {
      const home = buildTeam(clubId("home"), seed).setup;
      const away = buildTeam(clubId("away"), seed + 1000).setup;
      const explicit = (setup: MatchTeamSetup): MatchTeamSetup => ({
        ...setup,
        tactic: { ...setup.tactic, slots: setup.tactic.slots.map((slot) => ({ ...slot, setPieceRoles: DEFAULT_SET_PIECE_ROLES })) },
      });
      expect(simulateMatch({ seed, home: explicit(home), away: explicit(away) })).toEqual(simulateMatch({ seed, home, away }));
    }
  });

  it("resolve on any tactic, including one with no slots set", () => {
    const resolved = resolveTeamTactics(buildTeam(clubId("home"), 2).setup.tactic, new Map());
    expect(resolved.slots.every((slot) => slot.setPieceRoles === DEFAULT_SET_PIECE_ROLES)).toBe(true);
  });
});
