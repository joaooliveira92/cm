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
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import type {
  ClubId,
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
import { getMatchReport, getMatchStatistics, resumeSimulation, submitMatchCommand } from "../../../src/main/match/index.js";
import { commitMatchday } from "../../../src/main/season/commitMatchday.js";
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

/** A seeded match on the first Fixture, with the human club's kickoff XI, and its named bench. */
const seeded = (seed: number) =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, seed);
    const { squad, tactic } = yield* getTactics(savesDir, save.id);
    ok(tactic !== null);
    const clubId = humanClubOf(match);
    // A substitute must be named on the bench (decision request 04, ticket 35).
    const bench = tactic.bench.filter((id): id is PlayerId => id !== null);
    const goalkeeper = tactic.assignments[0]!;
    const command = (minute: number, isHalftime: boolean, body: SubmitBody, revealedEvents: number | null = 0) =>
      submitMatchCommand(savesDir, save.id, match.matchId, 0, revealedEvents, minute, isHalftime, { clubId, ...body } as never);
    const sub = (outPlayerId: PlayerId, inPlayerId: PlayerId): SubmitBody => ({ _tag: "MakeSubstitution", outPlayerId, inPlayerId });
    return { save, fixtureId, match, squad, tactic, clubId, bench, goalkeeper, command, sub };
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

/** The next spoken Commentary Line after `index`: a silent attribution line carries no text. */
const nextSpokenLine = (
  lines: ReadonlyArray<CommentaryLineView>,
  index: number,
): CommentaryLineView | undefined => lines.slice(index + 1).find((line) => line.text !== "");

/** The index of the forced Substitution for an Injury of `minute`: a Substitution line directly after
 *  an Injury line of the same minute. */
const forcedSubLineAt = (lines: ReadonlyArray<CommentaryLineView>, minute: number): number =>
  lines.findIndex(
    (line, index) =>
      line.tag === "Substitution" &&
      line.minute === minute &&
      lines[index - 1]?.tag === "Injury" &&
      lines[index - 1]!.minute === minute,
  );

/** The index of the human club's severe Injury whose forced Substitution is the next line. */
const severeInjuryLine = (
  lines: ReadonlyArray<CommentaryLineView>,
  injuries: ReadonlyArray<InjuryView>,
  clubId: ClubId,
): number =>
  lines.findIndex((line, index) => {
    if (line.tag !== "Injury" || lines[index + 1]?.tag !== "Substitution" || lines[index + 1]!.minute !== line.minute) return false;
    const injury = injuries[lines.slice(0, index).filter((other) => other.tag === "Injury").length];
    return injury?.tier === "red" && injury.teamClubId === clubId;
  });

/**
 * Seed 43: after the manager's substitutions at minutes 1-3 (every window used, bringing on the
 * bench in `STAND_IN_BENCH_ORDER`) and a minute-3 bring-off of the only goalkeeper, which drags an
 * outfield player into goal, that stand-in suffers a severe Injury. No
 * substitution is left, so a second outfield player is dragged into goal. Found by enumerating seeds
 * and bench orders over `deriveMatchEvents`; under the orders 0-1-2, 0-2-1, 1-0-2 and 1-2-0 no seed
 * up to 6000 injures the stand-in the drag picks. Re-pinned for group-g-match-day ticket 35, when the
 * substitutions began coming off the named bench, again 2026-10-01 when Regimen started scaling
 * Condition decay and Injury severity, and again for formations-and-instructions ticket 35, when
 * per-slot player instructions reached real matches.
 */
const GOALKEEPER_STAND_IN_SEED = 43;
/** Which bench entries come on at minutes 1, 2 and 3. */
const STAND_IN_BENCH_ORDER = [2, 0, 1] as const;

it.effect(
  "goalkeeper stand-ins spend no substitution, and a severe goalkeeper Injury at the cap reads unreplaced",
  () =>
    Effect.gen(function* () {
      const s = yield* seeded(GOALKEEPER_STAND_IN_SEED);
      const repin = `repin GOALKEEPER_STAND_IN_SEED (${GOALKEEPER_STAND_IN_SEED})`;
      for (const minute of [1, 2, 3]) {
        const response = yield* s.command(minute, false, s.sub(s.tactic.assignments[minute]!, s.bench[STAND_IN_BENCH_ORDER[minute - 1]!]!));
        strictEqual(response.substitutionApplied, true, repin);
      }
      const keeperOff = yield* s.command(3, false, { _tag: "ForceOff", playerId: s.goalkeeper });
      strictEqual(keeperOff.forceOffApplied, true, "the goalkeeper was on the pitch");
      strictEqual(humanSubs(keeperOff, s.match).used, 3, "dragging a player into goal after a bring-off is not a substitution");

      const { lines, injuries } = yield* drain(s.save.id, s.match.matchId);
      const standInInjuryLine = severeInjuryLine(lines, injuries, s.clubId);
      const injuryLine = lines[standInInjuryLine];
      strictEqual(injuryLine?.tag, "Injury", repin);
      strictEqual(lines[standInInjuryLine + 1]?.tag, "Substitution", repin);
      strictEqual(lines[standInInjuryLine + 1]?.minute, injuryLine.minute, repin);
      const injuryIndex = lines.slice(0, standInInjuryLine).filter((line) => line.tag === "Injury").length;
      const injury = injuries[injuryIndex]!;
      ok(injury.tier === "red" && injury.teamClubId === s.clubId, `the human club's severe Injury — ${repin}`);
      ok(
        lines.some((line) => line.tag === "Substitution" && line.minute === 3 && named(s.squad, line, s.goalkeeper) && named(s.squad, line, injury.playerId)),
        `the injured player is the one the bring-off dragged into goal — ${repin}`,
      );
      ok(named(s.squad, lines[standInInjuryLine + 1], injury.playerId), `the next line takes the injured stand-in off — ${repin}`);

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

it.effect("the Match Report lists goalkeeper stand-ins as moves into goal, and its substitutions agree with the statistic", () =>
  Effect.gen(function* () {
    const s = yield* seeded(GOALKEEPER_STAND_IN_SEED);
    const repin = `repin GOALKEEPER_STAND_IN_SEED (${GOALKEEPER_STAND_IN_SEED})`;
    for (const minute of [1, 2, 3]) {
      const response = yield* s.command(minute, false, s.sub(s.tactic.assignments[minute]!, s.bench[STAND_IN_BENCH_ORDER[minute - 1]!]!));
      strictEqual(response.substitutionApplied, true, repin);
    }
    strictEqual((yield* s.command(3, false, { _tag: "ForceOff", playerId: s.goalkeeper })).forceOffApplied, true, repin);
    const { lines, injuries } = yield* drain(s.save.id, s.match.matchId);
    const standInInjuryLine = severeInjuryLine(lines, injuries, s.clubId);
    const injuryLine = lines[standInInjuryLine];
    strictEqual(injuryLine?.tag, "Injury", repin);
    const injury = injuries[lines.slice(0, standInInjuryLine).filter((line) => line.tag === "Injury").length]!;
    ok(injury.tier === "red" && injury.teamClubId === s.clubId, `the human club's severe Injury — ${repin}`);
    strictEqual(lines[standInInjuryLine + 1]?.tag, "Substitution", repin);
    strictEqual(lines[standInInjuryLine + 1]?.minute, injuryLine.minute, repin);

    yield* commitMatchday(savesDir, s.save.id, s.fixtureId);
    const report = yield* getMatchReport(savesDir, s.save.id, s.match.matchId);

    const standIns = report.events.filter((event) => event.kind === "GoalkeeperStandIn");
    deepStrictEqual(
      standIns.map((event) => [event.clubId, event.minute, event.replaced?.playerId, event.replaced?.forcedByInjury]),
      [
        [s.clubId, 3, s.goalkeeper, false],
        [s.clubId, injuryLine.minute, injury.playerId, true],
      ],
      "the bring-off's drag and the injured stand-in's drag are moves into goal; only the second follows an Injury",
    );
    strictEqual(standIns[0]!.playerId, injury.playerId, `the injured player is the one the bring-off dragged into goal — ${repin}`);
    strictEqual(
      report.events.filter((event) => event.kind === "Substitution" || event.kind === "GoalkeeperStandIn").length,
      lines.filter((line) => line.tag === "Substitution").length,
      "every Substitution Match Event is listed once",
    );
    const statistic = report.statistics.rows.find((row) => row.key === "substitutions")!;
    const listed = (clubId: string) => report.events.filter((event) => event.kind === "Substitution" && event.clubId === clubId).length;
    deepStrictEqual(
      [listed(s.match.homeClubId), listed(s.match.awayClubId)],
      [statistic.home, statistic.away],
      "the incident list's substitutions agree with the substitutions statistic",
    );
    strictEqual(listed(s.clubId), 3);
  }),
);

/**
 * Seed 70: the human club's only substitution is forced by a severe Injury
 * in the second half, right after it, and the club also takes a knock in the second half; with the
 * manager's three early substitutions, no other human substitution comes before half time. Pinned
 * for ticket 18 and 19 specs. Re-pinned 2026-09-29 when players gained CM line and side ratings. Re-pinned 2026-10-01 when Regimen started scaling Condition decay and Injury severity.
 */
const FORCED_SUB_SEED = 70;

it.effect("a severe Injury a substitute came on for reads replaced", () =>
  Effect.gen(function* () {
    const s = yield* seeded(FORCED_SUB_SEED);
    const { lines, injuries } = yield* drain(s.save.id, s.match.matchId);
    const forcedInjuryLine = lines.findIndex((line, index) => line.tag === "Injury" && lines[index + 1]?.tag === "Substitution");
    strictEqual(lines[forcedInjuryLine]?.tag, "Injury", "repin FORCED_SUB_SEED");
    strictEqual(lines[forcedInjuryLine + 1]?.tag, "Substitution", "repin FORCED_SUB_SEED");
    const injury = injuries[lines.slice(0, forcedInjuryLine).filter((line) => line.tag === "Injury").length]!;
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
        nextSpokenLine(before.lines, index)!.minute > line.minute
      );
    });
    ok(knockLine !== -1, repin);
    const knockIndex = before.lines.slice(0, knockLine).filter((line) => line.tag === "Injury").length;
    const knocked = before.injuries[knockIndex]!;

    const response = yield* s.command(knocked.minute + 1, false, s.sub(knocked.playerId, s.bench[0]!));
    strictEqual(response.substitutionApplied, true, repin);
    const { lines, injuries } = yield* drain(s.save.id, s.match.matchId);
    strictEqual(nextSpokenLine(lines, knockLine)?.tag, "Substitution", `the substitution is the next Match Event — ${repin}`);
    strictEqual(injuries[knockIndex]?.playerId, knocked.playerId, repin);
    strictEqual(injuries[knockIndex]?.replaced, false);
  }),
);

/** Seed 3840: the human club's first substitution is forced by an Injury in regular minute 45, before
 *  half time. Re-pinned for group-g-match-day ticket 26, when a
 *  forced substitution started drawing on the named bench, again 2026-10-01 when Regimen started
 *  scaling Condition decay and Injury severity, and again for formations-and-instructions ticket 35,
 *  when per-slot player instructions reached real matches. */
const MINUTE_45_FORCED_SUB_SEED = 3840;

it.effect("a forced substitution in regular minute 45 spends a window", () =>
  Effect.gen(function* () {
    const s = yield* seeded(MINUTE_45_FORCED_SUB_SEED);
    const repin = `repin MINUTE_45_FORCED_SUB_SEED (${MINUTE_45_FORCED_SUB_SEED})`;
    const { lines } = yield* drain(s.save.id, s.match.matchId);
    const minute45ForcedSubLine = forcedSubLineAt(lines, 45);
    const forced = lines[minute45ForcedSubLine];
    strictEqual(forced?.tag, "Substitution", repin);
    strictEqual(forced.minute, 45, repin);
    strictEqual(lines[minute45ForcedSubLine - 1]?.tag, "Injury", repin);
    ok(lines.findIndex((line) => line.tag === "HalfTimeReached") > minute45ForcedSubLine, `before half time — ${repin}`);

    const after = yield* resumeSimulation(savesDir, s.save.id, s.match.matchId, 0, minute45ForcedSubLine + 1);
    strictEqual(humanSubs(after, s.match).used, 1, repin);
    strictEqual(humanSubs(after, s.match).windowsUsed, 1);
  }),
);

it.effect("a command clamped to minute 45 spends a window; a halftime instruction does not", () =>
  Effect.gen(function* () {
    const s = yield* seeded(FORCED_SUB_SEED);
    const clamped = yield* s.command(45, false, s.sub(s.tactic.assignments[1]!, s.bench[0]!));
    strictEqual(clamped.substitutionApplied, true);
    strictEqual(humanSubs(clamped, s.match).windowsUsed, 1, "a first-half stoppage command applies in minute 45 and opens a window");

    const halftime = yield* s.command(45, true, s.sub(s.tactic.assignments[2]!, s.bench[1]!));
    strictEqual(halftime.substitutionApplied, true);
    strictEqual(humanSubs(halftime, s.match).used, 2);
    strictEqual(humanSubs(halftime, s.match).windowsUsed, 1, "a halftime instruction opens no window");
  }),
);

it.effect("a minute-45 command the window cap refuses leaves a halftime instruction of the same pair windowless", () =>
  Effect.gen(function* () {
    const s = yield* seeded(FORCED_SUB_SEED);
    for (const minute of [1, 2, 3]) {
      const response = yield* s.command(minute, false, s.sub(s.tactic.assignments[minute]!, s.bench[minute - 1]!));
      strictEqual(response.substitutionApplied, true);
    }
    const pair = s.sub(s.tactic.assignments[4]!, s.bench[3]!);
    const clamped = yield* s.command(45, false, pair);
    strictEqual(clamped.substitutionApplied, false, "no window is left");
    const halftime = yield* s.command(45, true, pair);
    strictEqual(halftime.substitutionApplied, true, "half time needs no window");
    strictEqual(humanSubs(halftime, s.match).used, 4);
    strictEqual(humanSubs(halftime, s.match).windowsUsed, 3, "the minute-45 Substitution is the halftime instruction's");

    // The refused minute-45 command plays no Substitution in minute 45 or first-half stoppage; the
    // halftime instruction lands after `HalfTimeReached` (group-g-match-day 20), which is what keeps
    // it from re-simulating minute 45.
    const { lines } = yield* drain(s.save.id, s.match.matchId);
    const halfTime = lines.findIndex((line) => line.tag === "HalfTimeReached");
    ok(
      !lines.slice(0, halfTime).some((line) => line.tag === "Substitution" && line.minute >= 45),
      "repin FORCED_SUB_SEED: no Substitution in minute 45 or first-half stoppage",
    );
    strictEqual(lines[halfTime + 1]?.tag, "Substitution", "repin FORCED_SUB_SEED");
    strictEqual(lines[halfTime + 1]?.minute, 45, "repin FORCED_SUB_SEED: the halftime instruction keeps minute 45");
  }),
);

/**
 * Seed 5225: the human club's only substitution is forced by an Injury at minute 49 of first-half
 * stoppage. The engine opens a window whenever a substitution's
 * minute differs from the last window's, so manager substitutions at second-half minutes 48 and 49
 * open two more. Re-pinned 2026-10-01 when Regimen started scaling Condition decay and Injury
 * severity, and again for formations-and-instructions ticket 35, when per-slot player instructions
 * reached real matches. No seed up to 6000 forces one at minute 48 any more.
 */
const STOPPAGE_FORCED_SUB_SEED = 5225;

it.effect("windows follow the engine's last-window minute, not the set of distinct minutes", () =>
  Effect.gen(function* () {
    const s = yield* seeded(STOPPAGE_FORCED_SUB_SEED);
    const repin = `repin STOPPAGE_FORCED_SUB_SEED (${STOPPAGE_FORCED_SUB_SEED})`;
    const before = yield* drain(s.save.id, s.match.matchId);
    const stoppageForcedSubLine = forcedSubLineAt(before.lines, 49);
    strictEqual(before.lines[stoppageForcedSubLine]?.tag, "Substitution", repin);
    strictEqual(before.lines[stoppageForcedSubLine]?.minute, 49, repin);
    ok(before.lines.findIndex((line) => line.tag === "HalfTimeReached") > stoppageForcedSubLine, `first-half stoppage — ${repin}`);
    // The forced substitution takes an early bench entry, so the manager's come from the end of it.
    strictEqual(s.bench.length, 7, "the bench is full");

    for (const [minute, index] of [[48, 0], [49, 1]] as const) {
      const response = yield* s.command(minute, false, s.sub(s.tactic.assignments[index + 1]!, s.bench[index + 4]!));
      strictEqual(response.substitutionApplied, true, repin);
    }
    const refused = yield* s.command(60, false, s.sub(s.tactic.assignments[3]!, s.bench[6]!));
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
    const response = yield* s.command(3, false, s.sub(s.tactic.assignments[1]!, s.bench[0]!));
    strictEqual(humanSubs(response, s.match).used, 1);
    strictEqual(yield* humanStatistic(s.save.id, s.match.matchId, s.match, 0), 1);
  }),
);

it.effect("the same substitution submitted twice in one minute is applied once and refused once", () =>
  Effect.gen(function* () {
    const s = yield* seeded(FORCED_SUB_SEED);
    const pair = s.sub(s.tactic.assignments[1]!, s.bench[0]!);
    strictEqual((yield* s.command(3, false, pair)).substitutionApplied, true);
    const again: SubmitMatchCommandView = yield* s.command(3, false, pair);
    strictEqual(again.substitutionApplied, false, "the player has already come off");
    strictEqual(humanSubs(again, s.match).used, 1);
  }),
);

it.effect("a bring-off reports whether the player left the pitch", () =>
  Effect.gen(function* () {
    const s = yield* seeded(FORCED_SUB_SEED);
    const starter = s.tactic.assignments[1]!;
    const off = yield* s.command(3, false, { _tag: "ForceOff", playerId: starter });
    strictEqual(off.forceOffApplied, true);
    strictEqual(off.substitutionApplied, null);
    strictEqual((yield* s.command(3, false, { _tag: "ForceOff", playerId: starter })).forceOffApplied, false, "already off");
    strictEqual(
      (yield* s.command(4, false, { _tag: "ForceOff", playerId: s.bench[0]! })).forceOffApplied,
      false,
      "never on",
    );
    const sub = yield* s.command(5, false, s.sub(s.tactic.assignments[2]!, s.bench[0]!));
    strictEqual(sub.forceOffApplied, null);
  }),
);
