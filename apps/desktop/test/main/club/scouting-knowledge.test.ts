import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { ScoutingKnowledgeView, SaveId, type ClubId, type PlayerId } from "@cm-clone/contracts";
import { knowledgeConfidenceFor } from "@cm-clone/shared";
import { createSave } from "../../seeded-save.js";
import { getScoutingKnowledge } from "../../../src/main/club/index.js";

/**
 * Scouting Knowledge (Screen 126, group-i ticket 05): the read over `scouting_progress`. Progress rows
 * are written directly, as `team-scout-report.test.ts` does; accrual is covered in `scouting.test.ts`.
 */

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-scouting-knowledge-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

interface Fixture {
  readonly userClubId: ClubId;
  readonly ownPlayerId: PlayerId;
  readonly rivals: ReadonlyArray<{ readonly clubId: ClubId; readonly playerIds: ReadonlyArray<PlayerId> }>;
}

const loadFixture = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const user = yield* sql<{ id: ClubId }>`SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
  const userClubId = user[0]!.id;
  const own = yield* sql<{ id: PlayerId }>`SELECT id FROM players WHERE club_id = ${userClubId} ORDER BY id LIMIT 1`;
  const rows = yield* sql<{ clubId: ClubId; playerId: PlayerId }>`
    SELECT c.id as "clubId", p.id as "playerId" FROM clubs c JOIN players p ON p.club_id = c.id
    WHERE c.is_user_club = 0 ORDER BY c.id ASC, p.id ASC`;
  const clubIds = [...new Set(rows.map((row) => row.clubId))];
  const fixture: Fixture = {
    userClubId,
    ownPlayerId: own[0]!.id,
    rivals: clubIds.map((clubId) => ({
      clubId,
      playerIds: rows.filter((row) => row.clubId === clubId).map((row) => row.playerId),
    })),
  };
  return fixture;
});

const writeProgress = (clubId: ClubId, playerId: PlayerId, progress: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`INSERT INTO scouting_progress (club_id, player_id, progress)
               VALUES (${clubId}, ${playerId}, ${progress})
               ON CONFLICT(club_id, player_id) DO UPDATE SET progress = excluded.progress`;
  });

describe("getScoutingKnowledge (Screen 126)", () => {
  it.effect(
    "a save with no scouting reads as two empty lists, not an error",
    () =>
      Effect.gen(function* () {
        const save = yield* createSave(savesDir, "No Scouting");
        const view = yield* getScoutingKnowledge(savesDir, save.id);
        deepStrictEqual(view.clubs, []);
        deepStrictEqual(view.players, []);
      }),
    60_000,
  );

  it.effect(
    "an unknown save is SaveNotFoundError",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(getScoutingKnowledge(savesDir, SaveId.make("missing")));
        strictEqual(error._tag, "SaveNotFoundError");
      }),
  );

  it.effect(
    "lists only Clubs with a scouted Player, with whole-squad coverage, and never an own-squad Player",
    () =>
      Effect.gen(function* () {
        const save = yield* createSave(savesDir, "Scouted");
        const fixture = yield* withSave(save.id, loadFixture);
        const [first, second, untouched] = fixture.rivals;
        const [a1, a2] = first!.playerIds;
        const [b1] = second!.playerIds;

        yield* withSave(
          save.id,
          Effect.all(
            [
              writeProgress(fixture.userClubId, a1!, 40),
              writeProgress(fixture.userClubId, a2!, 100),
              writeProgress(fixture.userClubId, b1!, 10),
              // A Player the club scouted and has since signed still has a row; it must not surface.
              writeProgress(fixture.userClubId, fixture.ownPlayerId, 60),
            ],
            { concurrency: 1 },
          ),
        );

        const view = yield* getScoutingKnowledge(savesDir, save.id);

        deepStrictEqual(
          view.clubs.map((club) => club.clubId).sort(),
          [first!.clubId, second!.clubId].sort(),
        );
        expect(view.clubs.map((club) => club.clubId)).not.toContain(untouched!.clubId);
        expect(view.clubs.map((club) => club.clubId)).not.toContain(fixture.userClubId);

        const clubA = view.clubs.find((club) => club.clubId === first!.clubId)!;
        strictEqual(clubA.squadSize, first!.playerIds.length);
        strictEqual(clubA.scoutedCount, 2);
        strictEqual(clubA.fullyScoutedCount, 1);
        // Mean over the whole squad: the Unscouted members count as zero.
        const expectedA = 140 / (100 * first!.playerIds.length);
        expect(clubA.coverage).toBeCloseTo(expectedA, 10);
        strictEqual(clubA.knowledgeConfidence, knowledgeConfidenceFor(expectedA));

        const clubB = view.clubs.find((club) => club.clubId === second!.clubId)!;
        strictEqual(clubB.scoutedCount, 1);
        strictEqual(clubB.fullyScoutedCount, 0);
        expect(clubB.coverage).toBeCloseTo(10 / (100 * second!.playerIds.length), 10);
        strictEqual(clubB.knowledgeConfidence, "low");
        strictEqual(clubB.clubName.length > 0, true);

        deepStrictEqual(view.players.map((player) => player.playerId).sort(), [a1!, a2!, b1!].sort());
        expect(view.players.map((player) => player.playerId)).not.toContain(fixture.ownPlayerId);
        const byId = new Map(view.players.map((player) => [player.playerId, player]));
        strictEqual(byId.get(a1!)!.progress, 40);
        strictEqual(byId.get(a2!)!.progress, 100);
        strictEqual(byId.get(b1!)!.clubId, second!.clubId);
        strictEqual(byId.get(b1!)!.clubName, clubB.clubName);
      }),
    60_000,
  );

  it.effect(
    "lists a scouted Free Agent without a Club, and puts no figure on the wire",
    () =>
      Effect.gen(function* () {
        const save = yield* createSave(savesDir, "Free Agent");
        const fixture = yield* withSave(save.id, loadFixture);
        const target = fixture.rivals[0]!.playerIds[0]!;
        yield* withSave(
          save.id,
          Effect.gen(function* () {
            const sql = yield* SqlClient;
            yield* writeProgress(fixture.userClubId, target, 55);
            yield* sql`UPDATE players SET club_id = NULL WHERE id = ${target}`;
          }),
        );

        const view = yield* getScoutingKnowledge(savesDir, save.id);
        deepStrictEqual(view.clubs, []);
        strictEqual(view.players.length, 1);
        strictEqual(view.players[0]!.clubId, null);
        strictEqual(view.players[0]!.clubName, null);

        const encoded = yield* Schema.encodeEffect(ScoutingKnowledgeView)(view);
        deepStrictEqual(Object.keys(encoded.players[0]!).sort(), [
          "clubId",
          "clubName",
          "firstName",
          "lastName",
          "playerId",
          "progress",
        ]);
      }),
    60_000,
  );
});
