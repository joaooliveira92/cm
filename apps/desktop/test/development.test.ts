import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { coachModifier, developPlayer, type Category, type PlayerAttributes } from "@cm-clone/shared";
import type { ClubId, PlayerId, SaveId } from "@cm-clone/contracts";
import { loadCoachQuality } from "../src/main/staff.js";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { advanceCalendar } from "../src/main/season/index.js";
import { createSave } from "../src/main/saves.js";
import { getSquad, loadSquadPlayers } from "../src/main/squad.js";
import { setTrainingFocus } from "../src/main/training.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-development-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

interface PlayerMeta {
  readonly potentialAbility: number;
  readonly dateOfBirth: string;
  readonly focus: Category | null;
}

/** Player id -> (potentialAbility, dateOfBirth, focus) for asserting deterministic development. */
const loadPlayerMeta = (saveId: SaveId, clubId: ClubId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{
        playerId: PlayerId;
        potentialAbility: number;
        dateOfBirth: string;
        focus: Category | null;
      }>`SELECT p.id as "playerId", p.potential_ability as "potentialAbility", p.date_of_birth as "dateOfBirth", tf.focus as "focus"
         FROM players p LEFT JOIN training_focus tf ON tf.player_id = p.id
         WHERE p.club_id = ${clubId}`;
      return new Map(rows.map((row) => [row.playerId, row as PlayerMeta]));
    }),
  );

const userClubId = (saveId: SaveId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ id: ClubId }>`SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
      return rows[0]!.id;
    }),
  );

const countEvents = (saveId: string, streamType: string, tag: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ n: number }>`SELECT COUNT(*) as n FROM events WHERE stream_type = ${streamType} AND tag = ${tag}`;
      return rows[0]!.n;
    }),
  );

/** Advances the calendar until `SeasonConcluded` fires (the per-Season Player Development
 * boundary), bounded so a broken state machine can't hang the suite. */
const advanceToSeasonEnd = (saveId: SaveId) =>
  Effect.gen(function* () {
    for (let i = 0; i < 60; i++) {
      const result = yield* advanceCalendar(savesDir, saveId);
      if (result.seasonConcluded) return;
    }
    throw new Error("SeasonConcluded never fired within 60 advanceCalendar calls");
  });

// ---------------------------------------------------------------------------
// Ticket 04: wire Player Development into SeasonConcluded
// ---------------------------------------------------------------------------

it.effect("advancing to SeasonConcluded develops every user-club player deterministically and fires one PlayerDeveloped per club", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const clubId = yield* userClubId(save.id);

    const before = yield* withSave(save.id, loadSquadPlayers(clubId));
    const meta = yield* loadPlayerMeta(save.id, clubId);
    // The user's club has a coach, so its baseline is scaled. Read the multiplier from the same
    // place development does rather than hard-coding one — the coach's quality is derived from the
    // world seed, so it differs per save.
    const coach = yield* withSave(save.id, loadCoachQuality(clubId));
    const coachMultiplier = coach === null ? 1 : coachModifier(coach);
    const expected = new Map(
      before.map((player) => {
        const m = meta.get(player.id)!;
        return [
          player.id,
          developPlayer(player.attributes as PlayerAttributes, player.age, m.potentialAbility, m.focus ?? undefined, coachMultiplier),
        ];
      }),
    );

    yield* advanceToSeasonEnd(save.id);

    const after = yield* withSave(save.id, loadSquadPlayers(clubId));
    // Contract expiry at SeasonConcluded can release some of the user's players to Free Agency, so
    // the squad may legitimately shrink — but every player who remains must have developed exactly
    // as the deterministic `developPlayer` math predicts.
    ok(after.length > 0, "the user's squad should not be empty after a Season");
    for (const player of after) {
      const expectedAttributes = expected.get(player.id);
      ok(expectedAttributes, `expected pre-development attributes for ${player.id}`);
      deepStrictEqual(
        player.attributes,
        expectedAttributes,
        `stored Attributes must equal the deterministic developPlayer output for ${player.id}`,
      );
    }

    // One PlayerDeveloped event, on the human club's stream and no other. Every club's players
    // still develop — `players` is authoritative for what their attributes became — but recording
    // that for clubs nobody manages cost a measured ~204 MB of payloads per season (ticket 17).
    const clubCount = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const rows = yield* sql<{ n: number }>`SELECT COUNT(DISTINCT stream_id) as n FROM events WHERE stream_type = 'club' AND tag = 'PlayerDeveloped'`;
        return rows[0]!.n;
      }),
    );
    strictEqual(clubCount, 1, "PlayerDeveloped is recorded for the human's club alone");
  }),
  20000);

// ---------------------------------------------------------------------------
// Ticket 05: SetTrainingFocus command, persistence, read path, application
// ---------------------------------------------------------------------------

it.effect("sets and reads a player's Training Focus, rejecting non-own-squad players", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    const targetPlayerId = squad.players[0]!.id;

    // Read path: a fresh player has the no-focus default (null).
    strictEqual(squad.players[0]!.trainingFocus, null);

    // Set a focus on the user's own player.
    const view = yield* setTrainingFocus(savesDir, save.id, targetPlayerId, "technical");
    strictEqual(view.playerId, targetPlayerId);
    strictEqual(view.focus, "technical");

    // Read path reflects the newly set focus; the rest of the squad is unchanged (null).
    const afterSet = yield* getSquad(savesDir, save.id);
    strictEqual(afterSet.players.find((p) => p.id === targetPlayerId)!.trainingFocus, "technical");
    ok(afterSet.players.every((p) => p.id === targetPlayerId || p.trainingFocus === null));

    // A TrainingFocusSet event landed on the club stream.
    const eventCount = yield* countEvents(save.id, "club", "TrainingFocusSet");
    strictEqual(eventCount, 1);

    // Clearing a focus back to no-focus is allowed.
    const cleared = yield* setTrainingFocus(savesDir, save.id, targetPlayerId, null);
    strictEqual(cleared.focus, null);

    // Targeting a player on an AI club's squad is rejected.
    const aiPlayerId = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const rows = yield* sql<{ id: PlayerId }>`SELECT p.id FROM players p JOIN clubs c ON c.id = p.club_id WHERE c.is_user_club = 0 LIMIT 1`;
        return rows[0]!.id;
      }),
    );
    const rejected = yield* Effect.exit(setTrainingFocus(savesDir, save.id, aiPlayerId, "physical"));
    ok(rejected._tag === "Failure", "setting focus on an AI club's player must be rejected");
  }),
);

it.effect("a focused Category's growth step is multiplied at SeasonConcluded while the others develop unmodified", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const clubId = yield* userClubId(save.id);
    const squad = yield* getSquad(savesDir, save.id);
    const targetPlayerId = squad.players[0]!.id;

    // Pin the target to deterministic inputs: keep them at the club for the whole Season. Two
    // things otherwise move players at SeasonConcluded — contract expiry (fix the contract length)
    // and AI-club buying of user players at Transfer Value (zero every AI club's budget so none can
    // afford the target, the same "remove the confound" pattern `aiClubs.test.ts` uses). Park a
    // Technical Attribute well below its ceiling so a focused step provably differs from the
    // unmodified step.
    yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`UPDATE players SET passing = 1 WHERE id = ${targetPlayerId}`;
        yield* sql`UPDATE contracts SET years_remaining = 5 WHERE player_id = ${targetPlayerId}`;
        yield* sql`UPDATE club_budgets SET transfer_budget_remaining = 0 WHERE club_id <> ${clubId}`;
      }),
    );

    const before = yield* withSave(save.id, loadSquadPlayers(clubId));
    const beforePlayer = before.find((p) => p.id === targetPlayerId)!;
    const meta = yield* loadPlayerMeta(save.id, clubId);
    const m = meta.get(targetPlayerId)!;

    // Focus Technical: the expected next-season set applies the multiplier only to Technical.
    const coach = yield* withSave(save.id, loadCoachQuality(clubId));
    const coachMultiplier = coach === null ? 1 : coachModifier(coach);
    const expectedFocused = developPlayer(beforePlayer.attributes as PlayerAttributes, beforePlayer.age, m.potentialAbility, "technical", coachMultiplier);
    const expectedUnmodified = developPlayer(beforePlayer.attributes as PlayerAttributes, beforePlayer.age, m.potentialAbility, undefined, coachMultiplier);

    yield* setTrainingFocus(savesDir, save.id, targetPlayerId, "technical");
    yield* advanceToSeasonEnd(save.id);

    const after = yield* withSave(save.id, loadSquadPlayers(clubId));
    const afterPlayer = after.find((p) => p.id === targetPlayerId)!;
    ok(afterPlayer, "the pinned player should still be on the user's club after the Season");
    deepStrictEqual(afterPlayer.attributes, expectedFocused, "stored attributes reflect the focused development");
    ok(
      expectedFocused.passing !== expectedUnmodified.passing,
      "the focused (Technical) step should differ from the unmodified step",
    );
  }),
  20000);