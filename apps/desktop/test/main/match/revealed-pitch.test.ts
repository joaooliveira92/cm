import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import type {
  CommentaryLineView,
  MatchId,
  MatchSummary,
  PlayerId,
  ResumeSimulationView,
  SaveId,
  SquadPlayerView,
  SubmitMatchCommandView,
} from "@cm-clone/contracts";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { getTactics } from "../../../src/main/club/index.js";
import { resumeSimulation, submitMatchCommand } from "../../../src/main/match/index.js";
import { atFirstFixture, humanClubOf, startSeededMatch } from "./seededMatch.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-revealed-pitch-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

/**
 * A match seed on the first Fixture of `WORLD_SEED` where the human club has a player sent off
 * (the match's 10th Match Event, minute 53) and later a severe Injury (17th, minute 84) forces a
 * substitution from outside the starting XI (18th). Found by enumerating seeds over
 * `simulateMatch` with the kickoff setups. The test re-checks each part of the property from the
 * Commentary Lines and names this constant when one no longer holds.
 */
const RED_CARD_THEN_FORCED_SUB_SEED = 550;
const RED_CARD_LINE = 9;
const INJURY_LINE = 16;
const FORCED_SUB_LINE = 17;

const repin = `repin RED_CARD_THEN_FORCED_SUB_SEED (${RED_CARD_THEN_FORCED_SUB_SEED})`;

const humanPitch = (view: ResumeSimulationView, summary: MatchSummary) =>
  summary.isHome ? view.homePitch : view.awayPitch;

const onPitchIds = (view: ResumeSimulationView, summary: MatchSummary): ReadonlyArray<PlayerId> =>
  humanPitch(view, summary).onPitch.map((slot) => slot.playerId);

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

/** The human squad player a Commentary Line names. */
const playerNamedIn = (squad: ReadonlyArray<SquadPlayerView>, line: CommentaryLineView | undefined) =>
  squad.find((player) => line?.text.includes(`${player.firstName} ${player.lastName}`) === true);

it.effect("the pitch reflects a revealed red card and forced injury substitution, and nothing not yet revealed", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, RED_CARD_THEN_FORCED_SUB_SEED);
    const { squad, tactic } = yield* getTactics(savesDir, save.id);
    ok(tactic !== null);
    const startingXi = new Set(tactic.slots.map((slot) => slot.playerId));
    const outsideXi = squad.map((player) => player.id).filter((id) => !startingXi.has(id));

    // One Commentary Line per Match Event, so a line's index is its event's timeline position.
    const lines = yield* drainLines(save.id, match.matchId);
    strictEqual(lines[RED_CARD_LINE]?.tag, "RedCard", repin);
    strictEqual(lines[INJURY_LINE]?.tag, "Injury", repin);
    strictEqual(lines[FORCED_SUB_LINE]?.tag, "Substitution", repin);
    const sentOff = playerNamedIn(squad, lines[RED_CARD_LINE]);
    const injured = playerNamedIn(squad, lines[INJURY_LINE]);
    ok(sentOff && startingXi.has(sentOff.id), `a human starter is sent off — ${repin}`);
    ok(injured && startingXi.has(injured.id) && injured.id !== sentOff.id, `another human starter is injured — ${repin}`);
    const replacement = squad.find(
      (player) => outsideXi.includes(player.id) && lines[FORCED_SUB_LINE]!.text.includes(`${player.firstName} ${player.lastName}`),
    );
    ok(replacement, `the forced substitution brings on a player from outside the XI — ${repin}`);

    const at = (revealedEvents: number) => resumeSimulation(savesDir, save.id, match.matchId, 0, revealedEvents);

    // Before the red card: the kickoff XI, and every other squad player may come on.
    const kickoff = yield* at(RED_CARD_LINE);
    deepStrictEqual(
      humanPitch(kickoff, match).onPitch.map(({ playerId, position }) => ({ playerId, position })),
      tactic.slots.map(({ playerId, position }) => ({ playerId, position })),
    );
    deepStrictEqual(humanPitch(kickoff, match).substitutes, outsideXi);

    // The red card revealed: ten on the pitch, and the sent-off player cannot come back on.
    const afterRed = yield* at(RED_CARD_LINE + 1);
    strictEqual(onPitchIds(afterRed, match).length, 10);
    ok(!onPitchIds(afterRed, match).includes(sentOff.id));
    ok(!humanPitch(afterRed, match).substitutes.includes(sentOff.id));

    // The Injury revealed but not yet its forced substitution: the injured player is still on.
    const injuredOnly = yield* at(FORCED_SUB_LINE);
    ok(onPitchIds(injuredOnly, match).includes(injured.id), "an unrevealed forced substitution has not happened");
    ok(humanPitch(injuredOnly, match).substitutes.includes(replacement.id));

    // The forced substitution revealed: the injured player is off, the replacement in their slot.
    const afterSub = yield* at(FORCED_SUB_LINE + 1);
    const injuredSlot = tactic.slots.find((slot) => slot.playerId === injured.id)!;
    ok(!onPitchIds(afterSub, match).includes(injured.id), "the injured player is no longer offered off");
    ok(
      humanPitch(afterSub, match).onPitch.some(
        (slot) => slot.playerId === replacement.id && slot.position === injuredSlot.position,
      ),
    );
    ok(!humanPitch(afterSub, match).substitutes.includes(replacement.id), "the replacement is no longer offered on");
    ok(!humanPitch(afterSub, match).substitutes.includes(injured.id));
    strictEqual(onPitchIds(afterSub, match).length, 10);
  }),
);

/**
 * A match seed on the first Fixture of `WORLD_SEED` where, once the manager has used all three
 * substitution windows at minutes 1-3, the human club's 9th Match Event is a severe Injury at
 * minute 29 that leaves no substitution behind it: the engine refuses the forced substitution
 * and the player goes off to ten men. Found by enumerating seeds over `simulateMatch` with those
 * three commands; the test re-checks it.
 */
const RED_INJURY_WITHOUT_WINDOWS_SEED = 17;
const UNREPLACED_INJURY_LINE = 8;

it.effect("a severe Injury with no substitution left takes the player off from the moment it is revealed", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, RED_INJURY_WITHOUT_WINDOWS_SEED);
    const { squad, tactic } = yield* getTactics(savesDir, save.id);
    ok(tactic !== null);
    const clubId = humanClubOf(match);
    const outsideXi = squad.filter((player) => !tactic.slots.some((slot) => slot.playerId === player.id));
    for (const minute of [1, 2, 3]) {
      const response: SubmitMatchCommandView = yield* submitMatchCommand(savesDir, save.id, match.matchId, 0, 0, minute, false, {
        _tag: "MakeSubstitution",
        clubId,
        outPlayerId: tactic.slots[minute]!.playerId,
        inPlayerId: outsideXi[minute - 1]!.id,
      });
      strictEqual(response.substitutionApplied, true);
    }

    const lines = yield* drainLines(save.id, match.matchId);
    const pinned = `repin RED_INJURY_WITHOUT_WINDOWS_SEED (${RED_INJURY_WITHOUT_WINDOWS_SEED})`;
    strictEqual(lines[UNREPLACED_INJURY_LINE]?.tag, "Injury", pinned);
    strictEqual(lines[UNREPLACED_INJURY_LINE + 1]?.tag === "Substitution", false, pinned);
    const injured = playerNamedIn(squad, lines[UNREPLACED_INJURY_LINE]);
    ok(injured, `the Injury is the human club's — ${pinned}`);

    const before = yield* resumeSimulation(savesDir, save.id, match.matchId, 0, UNREPLACED_INJURY_LINE);
    ok(onPitchIds(before, match).includes(injured.id), `the injured player is on the pitch until then — ${pinned}`);
    const after = yield* resumeSimulation(savesDir, save.id, match.matchId, 0, UNREPLACED_INJURY_LINE + 1);
    ok(!onPitchIds(after, match).includes(injured.id), "the injured player is no longer offered off");
    strictEqual(onPitchIds(after, match).length, onPitchIds(before, match).length - 1);
    ok(!humanPitch(after, match).substitutes.includes(injured.id));
  }),
);

it.effect("a journaled substitution and bring-off change the pitch from the command on", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, RED_CARD_THEN_FORCED_SUB_SEED);
    const { squad, tactic } = yield* getTactics(savesDir, save.id);
    ok(tactic !== null);
    const clubId = humanClubOf(match);
    const outPlayerId = tactic.slots[1]!.playerId;
    const inPlayerId = squad.find((player) => !tactic.slots.some((slot) => slot.playerId === player.id))!.id;
    const broughtOff = tactic.slots[2]!.playerId;

    // Nothing revealed yet: a command applies at the start of its minute, ahead of any reveal.
    const subbed = yield* submitMatchCommand(savesDir, save.id, match.matchId, 0, 0, 3, false, {
      _tag: "MakeSubstitution",
      clubId,
      outPlayerId,
      inPlayerId,
    });
    strictEqual(subbed.substitutionApplied, true);
    ok(!onPitchIds(subbed, match).includes(outPlayerId));
    ok(onPitchIds(subbed, match).includes(inPlayerId));
    ok(!humanPitch(subbed, match).substitutes.includes(inPlayerId));
    ok(!humanPitch(subbed, match).substitutes.includes(outPlayerId));

    const forcedOff = yield* submitMatchCommand(savesDir, save.id, match.matchId, 0, 0, 3, false, {
      _tag: "ForceOff",
      clubId,
      playerId: broughtOff,
    });
    ok(!onPitchIds(forcedOff, match).includes(broughtOff), "a bring-off takes the player off");
    ok(!humanPitch(forcedOff, match).substitutes.includes(broughtOff));
    strictEqual(onPitchIds(forcedOff, match).length, 10);

    // Bringing off the only goalkeeper drags an outfield player into goal: the engine records that
    // as a forced Substitution of the same minute, which belongs to the command, not to the reveal.
    const goalkeeper = tactic.slots.find((slot) => slot.position === "GK")!.playerId;
    const keeperOff = yield* submitMatchCommand(savesDir, save.id, match.matchId, 0, 0, 3, false, {
      _tag: "ForceOff",
      clubId,
      playerId: goalkeeper,
    });
    const inGoal = humanPitch(keeperOff, match).onPitch.filter((slot) => slot.position === "GK");
    strictEqual(inGoal.length, 1, "someone stands in goal");
    ok(inGoal[0]!.playerId !== goalkeeper);
    ok(onPitchIds(forcedOff, match).includes(inGoal[0]!.playerId), "the stand-in was already on the pitch");
    strictEqual(onPitchIds(keeperOff, match).length, 9);
    ok(!humanPitch(keeperOff, match).substitutes.includes(goalkeeper));
  }),
);

it.effect("a bring-off of a player brought on earlier in the same minute takes them off again", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, RED_CARD_THEN_FORCED_SUB_SEED);
    const { squad, tactic } = yield* getTactics(savesDir, save.id);
    ok(tactic !== null);
    const clubId = humanClubOf(match);
    const outPlayerId = tactic.slots[1]!.playerId;
    const inPlayerId = squad.find((player) => !tactic.slots.some((slot) => slot.playerId === player.id))!.id;

    // The engine applies a minute's commands in journal order: the substitution, then the bring-off.
    const subbed = yield* submitMatchCommand(savesDir, save.id, match.matchId, 0, 0, 3, false, {
      _tag: "MakeSubstitution",
      clubId,
      outPlayerId,
      inPlayerId,
    });
    strictEqual(subbed.substitutionApplied, true);
    ok(onPitchIds(subbed, match).includes(inPlayerId));

    const broughtOff = yield* submitMatchCommand(savesDir, save.id, match.matchId, 0, 0, 3, false, {
      _tag: "ForceOff",
      clubId,
      playerId: inPlayerId,
    });
    ok(!onPitchIds(broughtOff, match).includes(inPlayerId), "the player brought on and then off is not on the pitch");
    ok(!humanPitch(broughtOff, match).substitutes.includes(inPlayerId), "nor offered on");
    ok(!onPitchIds(broughtOff, match).includes(outPlayerId));
    strictEqual(onPitchIds(broughtOff, match).length, 10);
  }),
);
