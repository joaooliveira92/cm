import { describe, expect, it } from "vitest";
import { DEFAULT_SET_PIECE_ROLES, type SetPieceRoles } from "@cm-clone/shared";
import { simulateMatch } from "../../src/match/simulate/index.js";
import { planCorner } from "../../src/match/simulate/cornerPlan.js";
import { parseCommentaryFile, renderCommentary } from "../../src/match/commentary.js";
import { SHIPPED } from "./shippedCommentary.js";
import { CORNER_FLICK_ON_BONUS, CORNER_ROLE_MATCH_BONUS } from "../../src/match/simulate/constants.js";
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

// ─── 02: corners follow the attacking roles and the delivery ─────────────────

describe("a corner follows the attacking roles and the delivery", () => {
  type CornerRole = SetPieceRoles["attackCorner"];

  /** A side whose slots at the given indexes have those corner roles. */
  const sideWith = (roles: Readonly<Record<number, CornerRole>> = {}) => {
    const setup = buildTeam(clubId("home"), 5).setup;
    const slots = setup.tactic.slots.map((slot, index) =>
      roles[index] === undefined ? slot : { ...slot, setPieceRoles: { ...DEFAULT_SET_PIECE_ROLES, attackCorner: roles[index]! } },
    );
    return initTeamState({ ...setup, tactic: { ...setup.tactic, slots } }, 1);
  };

  const outfieldIndexes = (team: ReturnType<typeof sideWith>) =>
    team.resolved.slots.flatMap((slot, index) => (slot.isGoalkeeper ? [] : [index]));
  const idAt = (team: ReturnType<typeof sideWith>, index: number) => team.resolved.slots[index]!.playerId;
  const attr = (team: ReturnType<typeof sideWith>, index: number, name: string) =>
    (team.playersById.get(idAt(team, index))!.attributes as unknown as Record<string, number>)[name]!;
  /** Outfield slot indexes other than the taker's, best header first, ties to the earlier slot. */
  const byHeading = (team: ReturnType<typeof sideWith>, takerIndex: number) =>
    outfieldIndexes(team)
      .filter((index) => index !== takerIndex)
      .sort((a, b) => attr(team, b, "heading") - attr(team, a, "heading") || a - b);

  const base = sideWith();
  const TAKER = outfieldIndexes(base)[0]!;
  const [BEST_HEADER, SECOND_HEADER, THIRD_HEADER] = byHeading(base, TAKER);

  it("at default, is headed by the best header and assisted by the taker, exactly as before", () => {
    expect(planCorner(base, idAt(base, TAKER), "default")).toEqual({
      kind: "header",
      headerId: idAt(base, BEST_HEADER!),
      assistId: idAt(base, TAKER),
      attackFactor: 1,
      defenceFactor: 1,
    });
  });

  it("leaves out the players kept back, and is weaker for it", () => {
    const team = sideWith({ [BEST_HEADER!]: "alwaysStayBack" });
    const plan = planCorner(team, idAt(team, TAKER), "default");
    expect(plan).toMatchObject({ kind: "header", headerId: idAt(team, SECOND_HEADER!) });
    expect(plan.kind === "header" && plan.attackFactor).toBeLessThan(1);
  });

  it("goes to the player attacking the near post when it is aimed there", () => {
    const team = sideWith({ [THIRD_HEADER!]: "attackNearPost" });
    expect(planCorner(team, idAt(team, TAKER), "nearPost")).toMatchObject({
      kind: "header",
      headerId: idAt(team, THIRD_HEADER!),
      attackFactor: CORNER_ROLE_MATCH_BONUS,
    });
    // Aimed at the far post instead, nobody's role matches, so the best header takes it.
    expect(planCorner(team, idAt(team, TAKER), "farPost")).toMatchObject({ headerId: idAt(team, BEST_HEADER!), attackFactor: 1 });
  });

  it("is flicked on from the near post to a far-post attacker, who scores off the flick", () => {
    const team = sideWith({ [SECOND_HEADER!]: "nearPostFlickOn", [THIRD_HEADER!]: "attackFarPost" });
    expect(planCorner(team, idAt(team, TAKER), "nearPost")).toMatchObject({
      kind: "header",
      headerId: idAt(team, THIRD_HEADER!),
      assistId: idAt(team, SECOND_HEADER!),
      attackFactor: CORNER_ROLE_MATCH_BONUS * CORNER_FLICK_ON_BONUS,
    });
  });

  it("weakens the defence when a teammate challenges the goalkeeper", () => {
    const team = sideWith({ [THIRD_HEADER!]: "challengeGoalkeeper" });
    expect(planCorner(team, idAt(team, TAKER), "default")).toMatchObject({ headerId: idAt(team, BEST_HEADER!), defenceFactor: 0.92 });
  });

  it("is shot from the edge of the area by the player waiting there, or played short to the short option", () => {
    const team = sideWith({ [SECOND_HEADER!]: "lurkOutsideArea", [THIRD_HEADER!]: "offerShortOption" });
    expect(planCorner(team, idAt(team, TAKER), "edgeOfArea")).toEqual({ kind: "volley", shooterId: idAt(team, SECOND_HEADER!), assistId: idAt(team, TAKER) });
    expect(planCorner(team, idAt(team, TAKER), "short")).toEqual({ kind: "short", receiverId: idAt(team, THIRD_HEADER!) });
    // With nobody offering, a short corner is headed like any other.
    expect(planCorner(base, idAt(base, TAKER), "short")).toMatchObject({ kind: "header" });
  });

  it("plays out in whole matches: short corners bring no shot, edge-of-area corners a shot from range", () => {
    const run = (corners: "short" | "edgeOfArea", role: CornerRole) =>
      Array.from({ length: 25 }, (_, index) => index + 1).flatMap((seed) => {
        const setup = buildTeam(clubId("home"), seed).setup;
        const target = setup.tactic.slots.findIndex((slot, index) => index > 0 && slot.cell.row !== "GK");
        const slots = setup.tactic.slots.map((slot, index) =>
          index === target ? { ...slot, setPieceRoles: { ...DEFAULT_SET_PIECE_ROLES, attackCorner: role } } : slot,
        );
        // Someone else takes the corner: a taker can't play it short to himself.
        const takerId = setup.tactic.slots.find((slot, index) => index !== target && slot.cell.row !== "GK")!.playerId;
        const home = {
          ...setup,
          tactic: {
            ...setup.tactic,
            slots,
            teamSetPieces: { ...setup.tactic.teamSetPieces, cornersLeft: corners, cornersRight: corners },
            takers: { ...setup.tactic.takers, cornersLeft: [takerId], cornersRight: [takerId] },
          },
        };
        const events = simulateMatch({ seed, home, away: buildTeam(clubId("away"), seed + 1000).setup });
        return events.flatMap((event, index) =>
          event._tag === "Corner" && event.teamClubId === clubId("home") ? [events[index + 1]] : [],
        );
      });
    const afterShort = run("short", "offerShortOption");
    expect(afterShort.length).toBeGreaterThan(5);
    expect(afterShort.filter((next) => next?._tag === "Goal" || next?._tag === "ShotOnTarget" || next?._tag === "ShotMissed")).toEqual([]);

    const afterEdge = run("edgeOfArea", "attackBallFromEdgeOfArea");
    expect(afterEdge.length).toBeGreaterThan(5);
    for (const shot of afterEdge) expect(shot).toMatchObject({ chanceType: "longShot" });
  });

  it("keeps the effect bounded: a strong corner plan raises corner goals, but not wildly", () => {
    const cornerGoals = (instructed: boolean) =>
      Array.from({ length: 80 }, (_, index) => index + 1).reduce((total, seed) => {
        const setup = buildTeam(clubId("home"), seed).setup;
        const outfield = setup.tactic.slots.flatMap((slot, index) => (slot.cell.row === "GK" ? [] : [index]));
        const roleFor = (index: number): CornerRole | undefined =>
          index === outfield[1] ? "nearPostFlickOn" : index === outfield[2] ? "attackFarPost" : index === outfield[3] ? "challengeGoalkeeper" : undefined;
        const slots = setup.tactic.slots.map((slot, index) =>
          instructed && roleFor(index) !== undefined ? { ...slot, setPieceRoles: { ...DEFAULT_SET_PIECE_ROLES, attackCorner: roleFor(index)! } } : slot,
        );
        const corners = instructed ? "nearPost" : "default";
        const home = { ...setup, tactic: { ...setup.tactic, slots, teamSetPieces: { ...setup.tactic.teamSetPieces, cornersLeft: corners, cornersRight: corners } } } as MatchTeamSetup;
        const events = simulateMatch({ seed, home, away: buildTeam(clubId("away"), seed + 1000).setup });
        return total + events.filter((event, at) => event._tag === "Goal" && event.teamClubId === clubId("home") && events[at - 1]?._tag === "Corner").length;
      }, 0);
    const before = cornerGoals(false);
    const after = cornerGoals(true);
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThan(before * 1.6 + 2);
  });

  it("reads an edge-of-area shot as a shot from range, not a header", () => {
    const home = clubId("home");
    const corner = { _tag: "Corner", minute: 20, half: 1, teamClubId: home, playerId: "taker", deliveryType: "edgeOfArea", side: "left" } as const;
    const volley = { _tag: "ShotMissed", minute: 20, half: 1, teamClubId: home, playerId: "p9", chanceType: "longShot" } as const;
    const { table } = parseCommentaryFile("[ShotMissed:longRange]\nFrom range.\n[ShotMissed:header]\nHeaded.\n", SHIPPED);
    const lines = renderCommentary([{ _tag: "MatchStarted", seed: 1, homeClubId: home, awayClubId: clubId("away") }, corner, volley] as never, 1, { clubName: String, playerName: String }, table);
    expect(lines[2]!.text).toBe("From range.");
  });
});

