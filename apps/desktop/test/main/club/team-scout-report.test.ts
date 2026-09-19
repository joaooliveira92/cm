import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { ClubId, SaveId } from "@cm-clone/contracts";
import { createSave } from "../../../src/main/world/index.js";
import { getTeamScoutReport } from "../../../src/main/club/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-team-scout-report-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/** A club in the save that the human does not manage, and its players. */
const rivalWithSquad = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{ clubId: ClubId; playerId: string }>`
    SELECT c.id as "clubId", p.id as "playerId"
    FROM clubs c JOIN players p ON p.club_id = c.id
    WHERE c.is_user_club = 0
    ORDER BY c.id ASC, p.id ASC`;
  return rows;
});

/**
 * Writes progress rows directly rather than driving `advanceCalendar` for each one.
 *
 * The accrual path is already covered end to end by `scouting.test.ts`; what this file is about is
 * what the *report* makes of progress that exists, so seeding it keeps the suite from paying for a
 * second full calendar walk per case.
 */
const scout = (clubId: ClubId, playerIds: ReadonlyArray<string>, progress: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    for (const playerId of playerIds) {
      yield* sql`INSERT INTO scouting_progress (club_id, player_id, progress)
                 VALUES (${clubId}, ${playerId}, ${progress})
                 ON CONFLICT(club_id, player_id) DO UPDATE SET progress = excluded.progress`;
    }
  });

const userClubId = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{ id: ClubId }>`SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
  return rows[0]!.id;
});

describe("getTeamScoutReport — the club-scoped read (Screen 49)", () => {
  it.effect(
    "reports a scouted rival, and refuses an unscouted one as absence of knowledge",
    () =>
      Effect.gen(function* () {
        const save = yield* createSave(savesDir, "Scout Report");
        const rows = yield* withSave(save.id, rivalWithSquad);
        const reader = yield* withSave(save.id, userClubId);

        const targetId = rows[0]!.clubId;
        const targetPlayers = rows.filter((r) => r.clubId === targetId).map((r) => r.playerId);
        const otherId = rows.find((r) => r.clubId !== targetId)!.clubId;

        // Nobody has been scouted yet, so every rival is the not-scouted failure rather than an
        // empty report — "we know nothing" must not render as "they are nothing".
        const before = yield* Effect.flip(getTeamScoutReport(savesDir, save.id, targetId));
        strictEqual((before as { readonly _tag: string })._tag, "ClubNotScoutedError");

        yield* withSave(save.id, scout(reader, targetPlayers, 60));

        const report = yield* getTeamScoutReport(savesDir, save.id, targetId);
        strictEqual(report.targetClubId, targetId);
        ok(report.keyPlayers.length > 0, "a scouted squad yields key players");
        ok(
          report.keyPlayers.every((p) => targetPlayers.includes(p.playerId)),
          "key players are drawn from the target's squad and nowhere else",
        );

        // Scouting one club tells the manager nothing about a different one.
        const untouched = yield* Effect.flip(getTeamScoutReport(savesDir, save.id, otherId));
        strictEqual((untouched as { readonly _tag: string })._tag, "ClubNotScoutedError");

        // The report is immutable per calendar revision: two reads at the same revision agree.
        const again = yield* getTeamScoutReport(savesDir, save.id, targetId);
        expect(again).toEqual(report);

        // No below-Fully-Scouted player's exact rating reaches the wire: ability is a band, and at
        // progress 60 the band is genuinely open rather than collapsed onto the true figure.
        ok(
          report.keyPlayers.every((p) => p.abilityLow < p.abilityHigh),
          "a partially scouted player's ability stays a range",
        );
      }),
    60_000,
  );

  it.effect(
    "has two other failures: a club that is not in the save, and a save that is not there",
    () =>
      Effect.gen(function* () {
        const save = yield* createSave(savesDir, "Scout Report");

        const noClub = yield* Effect.flip(
          getTeamScoutReport(savesDir, save.id, ClubId.make("club_nobody")),
        );
        strictEqual((noClub as { readonly _tag: string })._tag, "ClubNotFoundError");

        const noSave = yield* Effect.flip(
          getTeamScoutReport(savesDir, SaveId.make("save_nobody"), ClubId.make("club_nobody")),
        );
        strictEqual((noSave as { readonly _tag: string })._tag, "SaveNotFoundError");
      }),
    60_000,
  );
});
