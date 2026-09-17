/**
 * Substitution counts and command outcomes in the edge cases group-g-match-day ticket 25 names:
 * goalkeeper stand-ins, minute-45 windows, the statistics count, a repeated substitution, and a
 * bring-off's outcome. Seeds are pinned on `WORLD_SEED`'s first Fixture and each test re-checks the
 * property it relies on from the Commentary Lines, so seed drift fails loudly.
 */
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok, strictEqual } from "node:assert";
import type {
  CommentaryLineView,
  InjuryView,
  MatchId,
  MatchSummary,
  PlayerId,
  SaveId,
  SquadPlayerView,
  SubmitMatchCommandView,
} from "@cm-clone/contracts";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { getTactics } from "../../../src/main/club/index.js";
import { getMatchStatistics, resumeSimulation, submitMatchCommand } from "../../../src/main/match/index.js";
import { atFirstFixture, humanClubOf, humanSubs, startSeededMatch } from "./seededMatch.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-sub-accuracy-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const drain = (saveId: SaveId, matchId: MatchId) =>
  Effect.gen(function* () {
    const lines: Array<CommentaryLineView> = [];
    const injuries: Array<InjuryView> = [];
    let cursor = 0;
    let isComplete = false;
    while (!isComplete) {
      const chunk = yield* resumeSimulation(savesDir, saveId, matchId, cursor, null);
      lines.push(...chunk.lines);
      injuries.push(...chunk.injuries);
      cursor = chunk.cursor;
      isComplete = chunk.isComplete;
    }
    return { lines, injuries };
  });

/** A seeded match on the first Fixture, with the human club's kickoff XI and the squad outside it. */
const seeded = (seed: number) =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, seed);
    const { squad, tactic } = yield* getTactics(savesDir, save.id);
    ok(tactic !== null);
    const clubId = humanClubOf(match);
    const outsideXi = squad.filter((player) => !tactic.slots.some((slot) => slot.playerId === player.id));
    const goalkeeper = tactic.slots.find((slot) => slot.position === "GK")!.playerId;
    const command = (minute: number, isHalftime: boolean, body: SubmitBody, revealedEvents: number | null = 0) =>
      submitMatchCommand(savesDir, save.id, match.matchId, 0, revealedEvents, minute, isHalftime, { clubId, ...body } as never);
    const sub = (outPlayerId: PlayerId, inPlayerId: PlayerId): SubmitBody => ({ _tag: "MakeSubstitution", outPlayerId, inPlayerId });
    return { save, match, squad, tactic, clubId, outsideXi, goalkeeper, command, sub };
  });

type SubmitBody =
  | { readonly _tag: "MakeSubstitution"; readonly outPlayerId: PlayerId; readonly inPlayerId: PlayerId }
  | { readonly _tag: "ForceOff"; readonly playerId: PlayerId };

const humanStatistic = (saveId: SaveId, matchId: MatchId, summary: MatchSummary, revealedEvents: number | null) =>
  Effect.gen(function* () {
    const view = (yield* getMatchStatistics(savesDir, saveId, matchId, revealedEvents))!;
    const row = view.rows.find((r) => r.key === "substitutions")!;
    return summary.isHome ? row.home : row.away;
  });

const named = (squad: ReadonlyArray<SquadPlayerView>, line: CommentaryLineView | undefined, id: PlayerId) => {
  const player = squad.find((p) => p.id === id)!;
  return line?.text.includes(`${player.firstName} ${player.lastName}`) === true;
};

/**
 * Seed 26: after the manager's substitutions at minutes 1-3 (every window used) and a minute-3
 * bring-off of the only goalkeeper, which drags an outfield player into goal, that stand-in suffers
 * a severe Injury at minute 88 (the 24th Match Event). No substitution is left, so a second outfield
 * player is dragged into goal. Found by enumerating seeds 1-20000 over `deriveMatchEvents`.
 */
const GOALKEEPER_STAND_IN_SEED = 26;
const STAND_IN_INJURY_LINE = 23;

it.effect(
  "goalkeeper stand-ins spend no substitution, and a severe goalkeeper Injury at the cap reads unreplaced",
  () =>
    Effect.gen(function* () {
      const s = yield* seeded(GOALKEEPER_STAND_IN_SEED);
      const repin = `repin GOALKEEPER_STAND_IN_SEED (${GOALKEEPER_STAND_IN_SEED})`;
      for (const minute of [1, 2, 3]) {
        const response = yield* s.command(minute, false, s.sub(s.tactic.slots[minute]!.playerId, s.outsideXi[minute - 1]!.id));
        strictEqual(response.substitutionApplied, true, repin);
      }
      const keeperOff = yield* s.command(3, false, { _tag: "ForceOff", playerId: s.goalkeeper });
      strictEqual(keeperOff.forceOffApplied, true, "the goalkeeper was on the pitch");
      strictEqual(humanSubs(keeperOff, s.match).used, 3, "dragging a player into goal after a bring-off is not a substitution");

      const { lines, injuries } = yield* drain(s.save.id, s.match.matchId);
      const injuryLine = lines[STAND_IN_INJURY_LINE];
      strictEqual(injuryLine?.tag, "Injury", repin);
      strictEqual(lines[STAND_IN_INJURY_LINE + 1]?.tag, "Substitution", repin);
      strictEqual(lines[STAND_IN_INJURY_LINE + 1]?.minute, injuryLine.minute, repin);
      const injuryIndex = lines.slice(0, STAND_IN_INJURY_LINE).filter((line) => line.tag === "Injury").length;
      const injury = injuries[injuryIndex]!;
      ok(injury.tier === "red" && injury.teamClubId === s.clubId, `the human club's severe Injury — ${repin}`);
      ok(
        lines.some((line) => line.tag === "Substitution" && line.minute === 3 && named(s.squad, line, s.goalkeeper) && named(s.squad, line, injury.playerId)),
        `the injured player is the one the bring-off dragged into goal — ${repin}`,
      );
      ok(named(s.squad, lines[STAND_IN_INJURY_LINE + 1], injury.playerId), `the next line takes the injured stand-in off — ${repin}`);

      const whole = yield* resumeSimulation(savesDir, s.save.id, s.match.matchId, 0, null);
      const subs = humanSubs(whole, s.match);
      strictEqual(subs.used, 3, "neither goalkeeper stand-in counts");
      strictEqual(subs.remaining, 2);
      strictEqual(subs.windowsUsed, 3);
      strictEqual(subs.capReached, true);
      strictEqual(injury.replaced, false, "an outfield player moving into goal replaces no one: the team is down a player");
      strictEqual(yield* humanStatistic(s.save.id, s.match.matchId, s.match, null), 3, "the statistics count agrees with the panel");
    }),
);

/**
 * Seed 550: the human club's only substitution is forced by an Injury at minute 84: the 17th Match
 * Event, right after the Injury. Pinned for ticket 18 and 19 specs.
 */
const FORCED_SUB_SEED = 550;
const FORCED_SUB_INJURY_LINE = 16;

it.effect("a severe Injury a substitute came on for reads replaced", () =>
  Effect.gen(function* () {
    const s = yield* seeded(FORCED_SUB_SEED);
    const { lines, injuries } = yield* drain(s.save.id, s.match.matchId);
    strictEqual(lines[FORCED_SUB_INJURY_LINE]?.tag, "Injury", "repin FORCED_SUB_SEED");
    strictEqual(lines[FORCED_SUB_INJURY_LINE + 1]?.tag, "Substitution", "repin FORCED_SUB_SEED");
    const injury = injuries[lines.slice(0, FORCED_SUB_INJURY_LINE).filter((line) => line.tag === "Injury").length]!;
    strictEqual(injury.tier, "red");
    strictEqual(injury.replaced, true);
    ok(injuries.filter((other) => other.tier === "orange").every((other) => other.replaced === false), "a knock replaces no one");
  }),
);

it.effect("a knock replaces no one, even when the manager substitutes the player the next minute", () =>
  Effect.gen(function* () {
    const s = yield* seeded(FORCED_SUB_SEED);
    const repin = "repin FORCED_SUB_SEED: the human club takes a knock that ends its minute";
    const before = yield* drain(s.save.id, s.match.matchId);
    const knockLine = before.lines.findIndex((line, index) => {
      const injury = before.injuries[before.lines.slice(0, index).filter((other) => other.tag === "Injury").length];
      return (
        line.tag === "Injury" &&
        injury?.tier === "orange" &&
        injury.teamClubId === s.clubId &&
        line.minute > 45 &&
        line.minute < 90 &&
        before.lines[index + 1]!.minute > line.minute
      );
    });
    ok(knockLine !== -1, repin);
    const knockIndex = before.lines.slice(0, knockLine).filter((line) => line.tag === "Injury").length;
    const knocked = before.injuries[knockIndex]!;

    const response = yield* s.command(knocked.minute + 1, false, s.sub(knocked.playerId, s.outsideXi[0]!.id));
    strictEqual(response.substitutionApplied, true, repin);
    const { lines, injuries } = yield* drain(s.save.id, s.match.matchId);
    strictEqual(lines[knockLine + 1]?.tag, "Substitution", `the substitution is the next Match Event — ${repin}`);
    strictEqual(injuries[knockIndex]?.playerId, knocked.playerId, repin);
    strictEqual(injuries[knockIndex]?.replaced, false);
  }),
);

/** Seed 1292: the human club's only substitution is forced by an Injury in regular minute 45 (the
 *  11th Match Event), before half time. */
const MINUTE_45_FORCED_SUB_SEED = 1292;
const MINUTE_45_FORCED_SUB_LINE = 10;

it.effect("a forced substitution in regular minute 45 spends a window", () =>
  Effect.gen(function* () {
    const s = yield* seeded(MINUTE_45_FORCED_SUB_SEED);
    const repin = `repin MINUTE_45_FORCED_SUB_SEED (${MINUTE_45_FORCED_SUB_SEED})`;
    const { lines } = yield* drain(s.save.id, s.match.matchId);
    const forced = lines[MINUTE_45_FORCED_SUB_LINE];
    strictEqual(forced?.tag, "Substitution", repin);
    strictEqual(forced.minute, 45, repin);
    strictEqual(lines[MINUTE_45_FORCED_SUB_LINE - 1]?.tag, "Injury", repin);
    ok(lines.findIndex((line) => line.tag === "HalfTimeReached") > MINUTE_45_FORCED_SUB_LINE, `before half time — ${repin}`);

    const after = yield* resumeSimulation(savesDir, s.save.id, s.match.matchId, 0, MINUTE_45_FORCED_SUB_LINE + 1);
    strictEqual(humanSubs(after, s.match).used, 1, repin);
    strictEqual(humanSubs(after, s.match).windowsUsed, 1);
  }),
);

it.effect("a command clamped to minute 45 spends a window; a halftime instruction does not", () =>
  Effect.gen(function* () {
    const s = yield* seeded(FORCED_SUB_SEED);
    const clamped = yield* s.command(45, false, s.sub(s.tactic.slots[1]!.playerId, s.outsideXi[0]!.id));
    strictEqual(clamped.substitutionApplied, true);
    strictEqual(humanSubs(clamped, s.match).windowsUsed, 1, "a first-half stoppage command applies in minute 45 and opens a window");

    const halftime = yield* s.command(45, true, s.sub(s.tactic.slots[2]!.playerId, s.outsideXi[1]!.id));
    strictEqual(halftime.substitutionApplied, true);
    strictEqual(humanSubs(halftime, s.match).used, 2);
    strictEqual(humanSubs(halftime, s.match).windowsUsed, 1, "a halftime instruction opens no window");
  }),
);

it.effect("a minute-45 command the window cap refuses leaves a halftime instruction of the same pair windowless", () =>
  Effect.gen(function* () {
    const s = yield* seeded(FORCED_SUB_SEED);
    for (const minute of [1, 2, 3]) {
      const response = yield* s.command(minute, false, s.sub(s.tactic.slots[minute]!.playerId, s.outsideXi[minute - 1]!.id));
      strictEqual(response.substitutionApplied, true);
    }
    const pair = s.sub(s.tactic.slots[4]!.playerId, s.outsideXi[3]!.id);
    const clamped = yield* s.command(45, false, pair);
    strictEqual(clamped.substitutionApplied, false, "no window is left");
    const halftime = yield* s.command(45, true, pair);
    strictEqual(halftime.substitutionApplied, true, "half time needs no window");
    strictEqual(humanSubs(halftime, s.match).used, 4);
    strictEqual(humanSubs(halftime, s.match).windowsUsed, 3, "the minute-45 Substitution is the halftime instruction's");

    // Nothing happens in minute 45 or first-half stoppage, so only the journal and the windows can
    // tell the halftime instruction from a live minute-45 command.
    const { lines } = yield* drain(s.save.id, s.match.matchId);
    const halfTime = lines.findIndex((line) => line.tag === "HalfTimeReached");
    strictEqual(lines[halfTime - 1]?.tag, "Substitution", "repin FORCED_SUB_SEED");
    ok(lines[halfTime - 2]!.minute < 45, "repin FORCED_SUB_SEED: minute 45 and stoppage are silent");
  }),
);

/**
 * Seed 216: the human club's only substitution is forced by an Injury at minute 48 of first-half
 * stoppage (the 8th Match Event). The engine opens a window whenever a substitution's minute differs
 * from the last window's, so manager substitutions at second-half minutes 47 and 48 open two more.
 */
const STOPPAGE_FORCED_SUB_SEED = 216;
const STOPPAGE_FORCED_SUB_LINE = 7;

it.effect("windows follow the engine's last-window minute, not the set of distinct minutes", () =>
  Effect.gen(function* () {
    const s = yield* seeded(STOPPAGE_FORCED_SUB_SEED);
    const repin = `repin STOPPAGE_FORCED_SUB_SEED (${STOPPAGE_FORCED_SUB_SEED})`;
    const before = yield* drain(s.save.id, s.match.matchId);
    strictEqual(before.lines[STOPPAGE_FORCED_SUB_LINE]?.tag, "Substitution", repin);
    strictEqual(before.lines[STOPPAGE_FORCED_SUB_LINE]?.minute, 48, repin);
    ok(before.lines.findIndex((line) => line.tag === "HalfTimeReached") > STOPPAGE_FORCED_SUB_LINE, `first-half stoppage — ${repin}`);

    for (const [minute, index] of [[47, 0], [48, 1]] as const) {
      const response = yield* s.command(minute, false, s.sub(s.tactic.slots[index + 1]!.playerId, s.outsideXi[index + 5]!.id));
      strictEqual(response.substitutionApplied, true, repin);
    }
    const refused = yield* s.command(60, false, s.sub(s.tactic.slots[3]!.playerId, s.outsideXi[7]!.id));
    strictEqual(refused.substitutionApplied, false, `the engine has used three windows — ${repin}`);
    const whole = yield* resumeSimulation(savesDir, s.save.id, s.match.matchId, 0, null);
    strictEqual(humanSubs(whole, s.match).used, 3, repin);
    strictEqual(humanSubs(whole, s.match).windowsUsed, 3);
    strictEqual(humanSubs(whole, s.match).capReached, true);
  }),
);

it.effect("the statistics count manager substitutions as the panel does: once journaled", () =>
  Effect.gen(function* () {
    const s = yield* seeded(FORCED_SUB_SEED);
    const response = yield* s.command(3, false, s.sub(s.tactic.slots[1]!.playerId, s.outsideXi[0]!.id));
    strictEqual(humanSubs(response, s.match).used, 1);
    strictEqual(yield* humanStatistic(s.save.id, s.match.matchId, s.match, 0), 1);
  }),
);

it.effect("the same substitution submitted twice in one minute is applied once and refused once", () =>
  Effect.gen(function* () {
    const s = yield* seeded(FORCED_SUB_SEED);
    const pair = s.sub(s.tactic.slots[1]!.playerId, s.outsideXi[0]!.id);
    strictEqual((yield* s.command(3, false, pair)).substitutionApplied, true);
    const again: SubmitMatchCommandView = yield* s.command(3, false, pair);
    strictEqual(again.substitutionApplied, false, "the player has already come off");
    strictEqual(humanSubs(again, s.match).used, 1);
  }),
);

it.effect("a bring-off reports whether the player left the pitch", () =>
  Effect.gen(function* () {
    const s = yield* seeded(FORCED_SUB_SEED);
    const starter = s.tactic.slots[1]!.playerId;
    const off = yield* s.command(3, false, { _tag: "ForceOff", playerId: starter });
    strictEqual(off.forceOffApplied, true);
    strictEqual(off.substitutionApplied, null);
    strictEqual((yield* s.command(3, false, { _tag: "ForceOff", playerId: starter })).forceOffApplied, false, "already off");
    strictEqual(
      (yield* s.command(4, false, { _tag: "ForceOff", playerId: s.outsideXi[0]!.id })).forceOffApplied,
      false,
      "never on",
    );
    const sub = yield* s.command(5, false, s.sub(s.tactic.slots[2]!.playerId, s.outsideXi[0]!.id));
    strictEqual(sub.forceOffApplied, null);
  }),
);
