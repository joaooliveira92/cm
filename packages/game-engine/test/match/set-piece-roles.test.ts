import { describe, expect, it } from "vitest";
import { DEFAULT_PLAYER_INSTRUCTIONS, DEFAULT_SET_PIECE_ROLES, type SetPieceRoles } from "@cm-clone/shared";
import { simulateMatch } from "../../src/match/simulate/index.js";
import { defendCornerFactor, planCorner } from "../../src/match/simulate/cornerPlan.js";
import { defendFreeKickFactor, planFreeKick } from "../../src/match/simulate/freeKickPlan.js";
import { parseCommentaryFile } from "../../src/match/commentaryFile.js";
import { renderCommentary } from "../../src/match/commentary.js";
import { SHIPPED } from "./shippedCommentary.js";
import {
  CORNER_CLOSE_DOWN_BONUS,
  CORNER_DEFENCE_PRESENCE_FLOOR,
  CORNER_FLICK_ON_BONUS,
  CORNER_MAN_MARK_BONUS,
  CORNER_MARK_TARGET_BONUS,
  CORNER_ROLE_MATCH_BONUS,
  CORNER_ZONAL_BONUS,
  FREE_KICK_DECOY_BONUS,
  FREE_KICK_DISRUPT_KEEPER_FACTOR,
  FREE_KICK_DISRUPT_WALL_BONUS,
  FREE_KICK_WALL_BONUS_PER_PLAYER,
} from "../../src/match/simulate/constants.js";
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
      slots: [
        { cell: { row: "F", column: "C" }, instructions: DEFAULT_PLAYER_INSTRUCTIONS, setPieceRoles: GO_FORWARD },
        { cell: { row: "GK", column: "C" }, instructions: DEFAULT_PLAYER_INSTRUCTIONS },
      ],
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


// ─── 03: defending corners follow the defending roles ────────────────────────

describe("a corner is defended by the defending roles", () => {
  type DefendRole = SetPieceRoles["defendCorner"];

  const attacking = initTeamState(buildTeam(clubId("home"), 5).setup, 1);
  const takerId = attacking.resolved.slots.find((slot) => !slot.isGoalkeeper)!.playerId;
  const defendingWith = (role: DefendRole, howMany = 1) => {
    const setup = buildTeam(clubId("away"), 9).setup;
    let given = 0;
    const slots = setup.tactic.slots.map((slot) => {
      if (slot.cell.row === "GK" || given >= howMany) return slot;
      given += 1;
      return { ...slot, setPieceRoles: { ...DEFAULT_SET_PIECE_ROLES, defendCorner: role } };
    });
    return initTeamState({ ...setup, tactic: { ...setup.tactic, slots } }, 1);
  };
  const header = (delivery: "default" | "nearPost" | "farPost") => planCorner(attacking, takerId, delivery);
  const factor = (role: DefendRole, delivery: "default" | "nearPost" | "farPost", howMany = 1) =>
    defendCornerFactor(defendingWith(role, howMany), attacking, takerId, delivery, header(delivery));

  it("changes nothing when every defending role is default", () => {
    expect(factor("default", "nearPost", 10)).toBe(1);
  });

  it("defends worse with players left forward", () => {
    expect(factor("stayForward", "default", 2)).toBeCloseTo(CORNER_DEFENCE_PRESENCE_FLOOR + (1 - CORNER_DEFENCE_PRESENCE_FLOOR) * (8 / 10));
  });

  it("is stronger with a zonal defender at the post the corner is aimed at, and only there", () => {
    expect(factor("nearPost", "nearPost")).toBe(CORNER_ZONAL_BONUS);
    expect(factor("nearPost", "farPost")).toBe(1);
    expect(factor("farPost", "farPost")).toBe(CORNER_ZONAL_BONUS);
  });

  it("is stronger man-marking, and marking the kind of player who attacks the ball", () => {
    expect(factor("markMan", "default")).toBe(CORNER_MAN_MARK_BONUS);
    // At default the best header attacks the ball: he is the tall player.
    expect(factor("markTallPlayer", "default")).toBe(CORNER_MARK_TARGET_BONUS);
    expect(factor("markSmallPlayer", "default")).toBe(1);
  });

  it("closes down a shot from the edge of the area", () => {
    const volley = { kind: "volley", shooterId: takerId, assistId: takerId } as const;
    expect(defendCornerFactor(defendingWith("closeDown"), attacking, takerId, "edgeOfArea", volley)).toBe(CORNER_CLOSE_DOWN_BONUS);
    expect(defendCornerFactor(defendingWith("markMan"), attacking, takerId, "edgeOfArea", volley)).toBe(1);
  });
});

// ─── 04: free kicks follow the delivery and the roles ───────────────────────

describe("a free kick follows the delivery and the roles", () => {
  type AttackRole = SetPieceRoles["attackFreeKick"];
  type DefendRole = SetPieceRoles["defendFreeKick"];

  const sideWith = (seed: number, attack: Readonly<Record<number, AttackRole>> = {}, defend: DefendRole = "default", defenders = 0) => {
    const setup = buildTeam(clubId(seed === 5 ? "home" : "away"), seed).setup;
    let given = 0;
    const slots = setup.tactic.slots.map((slot, index) => {
      let roles = slot.setPieceRoles ?? DEFAULT_SET_PIECE_ROLES;
      if (attack[index] !== undefined) roles = { ...roles, attackFreeKick: attack[index]! };
      if (slot.cell.row !== "GK" && given < defenders) {
        given += 1;
        roles = { ...roles, defendFreeKick: defend };
      }
      return { ...slot, setPieceRoles: roles };
    });
    return initTeamState({ ...setup, tactic: { ...setup.tactic, slots } }, 1);
  };
  const base = sideWith(5);
  const outfield = base.resolved.slots.flatMap((slot, index) => (slot.isGoalkeeper ? [] : [index]));
  const TAKER = outfield[0]!;
  const takerId = base.resolved.slots[TAKER]!.playerId;

  it("is a direct shot at default, exactly as before", () => {
    expect(planFreeKick(base, takerId, "default")).toEqual({ kind: "shot", attackFactor: 1, keeperFactor: 1 });
    expect(defendFreeKickFactor(sideWith(9), "default", planFreeKick(base, takerId, "default"))).toBe(1);
  });

  it("is kept when played short or long", () => {
    expect(planFreeKick(base, takerId, "short")).toEqual({ kind: "kept" });
    expect(planFreeKick(base, takerId, "long")).toEqual({ kind: "kept" });
  });

  it("is crossed to the best header in the box, leaving out players kept back or at the ball", () => {
    const best = planFreeKick(base, takerId, "crossCentre");
    expect(best).toMatchObject({ kind: "header", attackFactor: 1 });
    const bestIndex = base.resolved.slots.findIndex((slot) => best.kind === "header" && slot.playerId === best.headerId);
    const team = sideWith(5, { [bestIndex]: "alwaysStayBack" });
    const without = planFreeKick(team, takerId, "crossCentre");
    expect(without.kind === "header" && without.headerId).not.toBe(best.kind === "header" && best.headerId);
    expect(planFreeKick(base, takerId, "aimForBestHeader")).toMatchObject({ kind: "header", attackFactor: CORNER_ROLE_MATCH_BONUS });
  });

  it("is helped by disrupting the wall or the keeper, and by a decoy", () => {
    expect(planFreeKick(sideWith(5, { [outfield[1]!]: "disruptWall" }), takerId, "default")).toMatchObject({ attackFactor: FREE_KICK_DISRUPT_WALL_BONUS });
    expect(planFreeKick(sideWith(5, { [outfield[1]!]: "runOverBall" }), takerId, "default")).toMatchObject({ attackFactor: FREE_KICK_DECOY_BONUS });
    expect(planFreeKick(sideWith(5, { [outfield[1]!]: "disruptGoalkeeper" }), takerId, "default")).toMatchObject({ keeperFactor: FREE_KICK_DISRUPT_KEEPER_FACTOR });
  });

  it("is defended by the wall against a shot, and by markers and zones against a cross", () => {
    const shot = planFreeKick(base, takerId, "default");
    expect(defendFreeKickFactor(sideWith(9, {}, "formWall", 3), "default", shot)).toBeCloseTo(1 + FREE_KICK_WALL_BONUS_PER_PLAYER * 3);
    expect(defendFreeKickFactor(sideWith(9, {}, "formWall", 6), "default", shot)).toBeCloseTo(1 + FREE_KICK_WALL_BONUS_PER_PLAYER * 4);
    const cross = planFreeKick(base, takerId, "crossNear");
    expect(defendFreeKickFactor(sideWith(9, {}, "nearPost", 1), "crossNear", cross)).toBe(CORNER_ZONAL_BONUS);
    expect(defendFreeKickFactor(sideWith(9, {}, "manMark", 1), "crossFar", cross)).toBe(CORNER_MAN_MARK_BONUS);
    expect(defendFreeKickFactor(sideWith(9, {}, "forward", 2), "crossCentre", cross)).toBeLessThan(1);
  });

  it("plays out in whole matches: a crossed free kick is headed by someone else, a kept one brings no shot", () => {
    const followUps = (delivery: "crossCentre" | "short") =>
      Array.from({ length: 30 }, (_, index) => index + 1).flatMap((seed) => {
        const setup = buildTeam(clubId("home"), seed).setup;
        const home = { ...setup, tactic: { ...setup.tactic, teamSetPieces: { ...setup.tactic.teamSetPieces, freeKicksLeft: delivery, freeKicksRight: delivery } } };
        const events = simulateMatch({ seed, home, away: buildTeam(clubId("away"), seed + 1000).setup });
        return events.flatMap((event, at) =>
          event._tag === "FreeKick" && event.teamClubId === clubId("home") ? [{ kick: event, next: events[at + 1] }] : [],
        );
      });
    const crossed = followUps("crossCentre");
    expect(crossed.length).toBeGreaterThan(3);
    for (const { kick, next } of crossed) {
      expect(kick).toMatchObject({ deliveryType: "crossCentre" });
      expect(next).toMatchObject({ chanceType: "cross", assistPlayerId: kick.playerId });
      expect(next && "playerId" in next && next.playerId).not.toBe(kick.playerId);
    }
    const kept = followUps("short");
    expect(kept.length).toBeGreaterThan(3);
    expect(kept.filter(({ next }) => next?._tag === "Goal" || next?._tag === "ShotOnTarget" || next?._tag === "ShotMissed")).toEqual([]);
  });
});

// ─── 05: commentary for the new set-piece outcomes ───────────────────────────

describe("commentary for the set-piece instructions", () => {
  const names = { clubName: (id: string) => (id === "home" ? "Rovers" : "United"), playerName: (id: string) => `P${id.slice(-3)}` };
  const pool = (key: keyof typeof SHIPPED.templates) => SHIPPED.templates[key];
  /** Whether `text` is one of `key`'s lines with its placeholders filled. */
  const fromPool = (text: string, key: keyof typeof SHIPPED.templates) =>
    pool(key).some((line) => new RegExp(`^${line.replace(/[.*+?^$()[\]\\]/g, "\\$&").replace(/\|/g, " ").replace(/\{\w+\}/g, ".+")}$`).test(text));

  /** Whole matches where the home side corners near post with a flick-on, plays short free kicks on the
   *  left and crosses them on the right, and has a short-corner option. */
  const matches = () =>
    Array.from({ length: 30 }, (_, index) => index + 1).map((seed) => {
      const setup = buildTeam(clubId("home"), seed).setup;
      const outfield = setup.tactic.slots.flatMap((slot, index) => (slot.cell.row === "GK" ? [] : [index]));
      const role = (index: number): SetPieceRoles["attackCorner"] | undefined =>
        index === outfield[2] ? "nearPostFlickOn" : index === outfield[3] ? "attackFarPost" : undefined;
      const slots = setup.tactic.slots.map((slot, index) =>
        role(index) === undefined ? slot : { ...slot, setPieceRoles: { ...DEFAULT_SET_PIECE_ROLES, attackCorner: role(index)! } },
      );
      const home = {
        ...setup,
        tactic: {
          ...setup.tactic,
          slots,
          teamSetPieces: { ...setup.tactic.teamSetPieces, cornersLeft: "nearPost", cornersRight: "nearPost", freeKicksLeft: "short", freeKicksRight: "crossFar" },
        },
      } as MatchTeamSetup;
      const events = simulateMatch({ seed, home, away: buildTeam(clubId("away"), seed + 1000).setup });
      return { events, lines: renderCommentary(events, seed, names, SHIPPED) };
    });

  it("fills every placeholder and draws each outcome from its own section", () => {
    let flickOns = 0;
    let crossedFreeKicks = 0;
    let keptFreeKicks = 0;
    let nearPostCorners = 0;
    for (const { events, lines } of matches()) {
      for (const [index, line] of lines.entries()) {
        expect(line.text, line.tag).not.toMatch(/\{\w+\}/);
        const event = events[index]!;
        if (event._tag === "Corner" && event.deliveryType === "nearPost") {
          nearPostCorners += 1;
          expect(fromPool(line.text, "Corner:nearPost"), line.text).toBe(true);
        }
        if (event._tag === "FreeKick" && event.deliveryType === "short") {
          keptFreeKicks += 1;
          expect(fromPool(line.text, "FreeKick:kept"), line.text).toBe(true);
        }
        if (event._tag === "FreeKick" && event.deliveryType === "crossFar") {
          crossedFreeKicks += 1;
          expect(fromPool(line.text, "FreeKick:cross"), line.text).toBe(true);
        }
        const previous = events[index - 1];
        if (
          (event._tag === "ShotOnTarget" || event._tag === "ShotMissed") &&
          previous?._tag === "Corner" &&
          event.assistPlayerId !== undefined &&
          event.assistPlayerId !== previous.playerId
        ) {
          flickOns += 1;
          expect(fromPool(line.text, `${event._tag}:flickOn`), line.text).toBe(true);
        }
      }
    }
    expect({ nearPostCorners: nearPostCorners > 5, keptFreeKicks: keptFreeKicks > 0, crossedFreeKicks: crossedFreeKicks > 0, flickOns: flickOns > 0 }).toEqual({
      nearPostCorners: true,
      keptFreeKicks: true,
      crossedFreeKicks: true,
      flickOns: true,
    });
  });
});
