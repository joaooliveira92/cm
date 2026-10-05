/**
 * A red card to the last goalkeeper drags an outfield stand-in into goal (group-g-match-day ticket 36,
 * decision request 06 Option A), and the reads agree: the pitch has the stand-in in goal and ten men,
 * the substitution counts spend nothing, and the Match Report lists a move into goal, neither an
 * injury nor a substitution. The seed is pinned on `WORLD_SEED`'s first Fixture and the test
 * re-checks the property it relies on from the Commentary Lines, so seed drift fails loudly.
 */
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import type { CommentaryLineView, MatchId, SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { getTactics } from "../../../src/main/club/index.js";
import { getMatchReport, resumeSimulation } from "../../../src/main/match/index.js";
import { commitMatchday } from "../../../src/main/season/commitMatchday.js";
import { revealed } from "./revealedEvents.js";
import { atFirstFixture, humanClubOf, humanSubs, startSeededMatch } from "./seededMatch.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-red-card-stand-in-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

/**
 * Seed 1322: the human club's only goalkeeper is sent off at minute `RED_CARD_MINUTE` (its RedCard
 * Commentary Line), and the engine drags an outfield player into goal as the very next event, with no
 * substitution before it. Found by enumerating seeds over `deriveMatchEvents` with the kickoff setups;
 * the first such seed for the human club. Re-pinned 2026-09-29 when players gained CM line and side
 * ratings. Re-pinned 2026-10-01 when Regimen started scaling Condition decay and Injury severity.
 * Re-pinned for formations-and-instructions ticket 35, when per-slot player instructions reached real
 * matches.
 */
const KEEPER_SENT_OFF_SEED = 1322;
const RED_CARD_MINUTE = 11;
const repin = `repin KEEPER_SENT_OFF_SEED (${KEEPER_SENT_OFF_SEED})`;

const drainLines = (saveId: SaveId, matchId: MatchId) =>
  Effect.gen(function* () {
    const lines: Array<CommentaryLineView> = [];
    let cursor = 0;
    let isComplete = false;
    while (!isComplete) {
      const chunk = yield* resumeSimulation(savesDir, saveId, matchId, cursor, null);
      lines.push(...chunk.lines);
      cursor = chunk.cursor;
      isComplete = chunk.isComplete;
    }
    return lines;
  });

const seeded = Effect.gen(function* () {
  const { save, fixtureId } = yield* atFirstFixture(savesDir);
  const match = yield* startSeededMatch(savesDir, save.id, fixtureId, KEEPER_SENT_OFF_SEED);
  const { squad, tactic } = yield* getTactics(savesDir, save.id);
  ok(tactic !== null);
  const keeper = squad.find((player) => player.id === tactic.assignments[0]!)!;
  const lines = yield* drainLines(save.id, match.matchId);
  const redCardLine = lines.findIndex((line) => line.tag === "RedCard");
  const red = lines[redCardLine];
  strictEqual(red?.tag, "RedCard", repin);
  strictEqual(red.minute, RED_CARD_MINUTE, repin);
  ok(red.text.includes(`${keeper.firstName} ${keeper.lastName}`), `the human goalkeeper is sent off — ${repin}`);
  strictEqual(lines[redCardLine + 1]?.tag, "Substitution", `the stand-in follows the red card — ${repin}`);
  return { save, fixtureId, match, keeper, clubId: humanClubOf(match), starters: [...tactic.assignments], redCardLine };
});

it.effect("the pitch has an outfield stand-in in goal and ten men, and no substitution is spent", () =>
  Effect.gen(function* () {
    const s = yield* seeded;
    const pitchAt = (revealedEvents: number) =>
      Effect.map(resumeSimulation(savesDir, s.save.id, s.match.matchId, 0, revealed(revealedEvents)), (view) => ({
        view,
        pitch: s.match.isHome ? view.homePitch : view.awayPitch,
      }));

    const before = yield* pitchAt(s.redCardLine);
    strictEqual(before.pitch.onPitch.length, 11);
    strictEqual(before.pitch.onPitch.find((slot) => slot.position === "GK")?.playerId, s.keeper.id);

    const after = yield* pitchAt(s.redCardLine + 2);
    const inGoal = after.pitch.onPitch.filter((slot) => slot.position === "GK");
    strictEqual(after.pitch.onPitch.length, 10);
    strictEqual(inGoal.length, 1, "someone stands in goal");
    ok(inGoal[0]!.playerId !== s.keeper.id);
    ok(s.starters.includes(inGoal[0]!.playerId), "the stand-in was already on the pitch");
    ok(!after.pitch.onPitch.some((slot) => slot.playerId === s.keeper.id), "the goalkeeper is off");
    ok(!after.pitch.substitutes.includes(s.keeper.id), "a sent-off goalkeeper does not come back on");
    deepStrictEqual(
      humanSubs(after.view, s.match),
      humanSubs(before.view, s.match),
      "moving a player into goal spends no substitution and no window",
    );
    strictEqual(humanSubs(after.view, s.match).used, 0, repin);
  }),
);

it.effect("the Match Report lists the stand-in as a move into goal after the red card, not an injury or a substitution", () =>
  Effect.gen(function* () {
    const s = yield* seeded;
    yield* commitMatchday(savesDir, s.save.id, s.fixtureId);
    const report = yield* getMatchReport(savesDir, s.save.id, s.match.matchId);

    const atRed = report.events.filter((event) => event.clubId === s.clubId && event.minute === RED_CARD_MINUTE);
    deepStrictEqual(
      atRed.map((event) => [event.kind, event.replaced?.playerId ?? null, event.replaced?.forcedByInjury ?? null]),
      [
        ["RedCard", null, null],
        ["GoalkeeperStandIn", s.keeper.id, false],
      ],
      `the red card, then a move into goal that no injury forced — ${repin}`,
    );
    ok(!report.events.some((event) => event.kind === "Injury" && event.playerId === s.keeper.id), "the goalkeeper was not injured");
    const listed = report.events.filter((event) => event.kind === "Substitution" && event.clubId === s.clubId).length;
    const statistic = report.statistics.rows.find((row) => row.key === "substitutions")!;
    strictEqual(listed, 0, repin);
    strictEqual(s.match.isHome ? statistic.home : statistic.away, listed, "the statistic agrees with the incident list");
  }),
);
