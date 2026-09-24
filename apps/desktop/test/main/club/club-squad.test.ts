/**
 * Club Squad (Screen 35, group-c ticket 10): any club's squad, read by the human club's Scouting
 * Progress through the shared knowledge rule (Agent Note 2026-09-19, tickets 09/10).
 *
 * The club-scoped sibling of `getSquad`, which stays the manager's own read. These prove the two
 * halves of the rule on this read: the manager's own club — if this route is reached for it —
 * reads exact like the own-club Squad screen, and a rival's Players read as Attribute Ranges
 * below Fully Scouted and exact at it, identical to the figures the market publishes.
 */
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { ClubId, type PlayerId } from "@cm-clone/contracts";
import { type KnownFigure } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, expect } from "vitest";
import { createSave } from "../../seeded-save.js";
import { getClubSquad, getSquad } from "../../../src/main/club/index.js";
import { getPlayerProfile } from "../../../src/main/career/player.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-club-squad-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/** A club the human does not manage — the point of the screen being club-scoped. */
const aRivalClub = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{ id: ClubId }>`
    SELECT id FROM clubs WHERE is_user_club = 0 ORDER BY id LIMIT 1`;
  return rows[0]!.id;
});

/** The human club's Scouting Progress on a player, seeded so the squad read narrows. */
const setScoutingProgress = (saveId: string, clubId: string, playerId: PlayerId, progress: number) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`DELETE FROM scouting_progress WHERE club_id = ${clubId} AND player_id = ${playerId}`;
      yield* sql`INSERT INTO scouting_progress (club_id, player_id, progress) VALUES (${clubId}, ${playerId}, ${progress})`;
    }),
  );

const isRange = (figure: KnownFigure): figure is { _tag: "range"; low: number; high: number } =>
  figure._tag === "range";

it.effect("the manager's own club, reached through this route, reads every figure exact", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Club Squad");
    const own = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const client = yield* SqlClient;
        const rows = yield* client<{ id: ClubId }>`
          SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
        return rows[0]!.id;
      }),
    );

    const view = yield* getClubSquad(savesDir, save.id, own);
    const squad = yield* getSquad(savesDir, save.id);

    strictEqual(view.isUserClub, true);
    ok(view.players.length > 0);
    // AC (own club): figures read exact and agree with the own-club Squad read, which stays
    // exact plain numbers.
    for (const player of view.players) {
      strictEqual(player.overallRating._tag, "exact", "own OVR should read exact");
      for (const [attribute, figure] of Object.entries(player.attributes)) {
        if (figure !== undefined) strictEqual(figure._tag, "exact", `own ${attribute} should read exact`);
      }
      const truth = squad.players.find((p) => p.id === player.id);
      ok(truth !== undefined, "the own route returns the same squad the own screen reads");
      strictEqual(player.overallRating.value, truth!.overallRating);
      // The own-club fields the rival read would withhold are absent from this read too — the
      // wire is one shape, exact-or-range figures plus the disclosed facts.
      for (const withheld of ["condition", "trainingFocus", "positionRatings"] as const) {
        ok(!Object.hasOwn(player as unknown as Record<string, unknown>, withheld), `own wire must not carry ${withheld}`);
      }
    }
  }),
);

it.effect("an unscouted rival's squad reads every figure as a Range, and no exact figure leaks", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Club Squad");
    const rival = yield* withSave(save.id, aRivalClub);
    const human = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const client = yield* SqlClient;
        const rows = yield* client<{ id: ClubId }>`
          SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
        return rows[0]!.id;
      }),
    );

    // One rival at 99 — one short of Fully Scouted — so the no-exact walk covers a live narrow band.
    const view0 = yield* getClubSquad(savesDir, save.id, rival);
    yield* setScoutingProgress(save.id, human, view0.players[0]!.id, 99);
    const view = yield* getClubSquad(savesDir, save.id, rival);

    strictEqual(view.isUserClub, false);
    ok(view.players.length > 0);
    for (const player of view.players) {
      ok(isRange(player.overallRating), `${player.firstName} OVR leaked an exact figure`);
      for (const [attribute, figure] of Object.entries(player.attributes)) {
        if (figure !== undefined) ok(isRange(figure), `${player.firstName} ${attribute} leaked an exact figure`);
      }
    }
  }),
);

it.effect("the published Range narrows as Scouting Progress rises and never widens, at 0, 50 and 100", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Club Squad");
    const rival = yield* withSave(save.id, aRivalClub);
    const human = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const client = yield* SqlClient;
        const rows = yield* client<{ id: ClubId }>`
          SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
        return rows[0]!.id;
      }),
    );

    const target = (yield* getClubSquad(savesDir, save.id, rival)).players[0]!;

    const overallAt = (progress: number) =>
      Effect.gen(function* () {
        yield* setScoutingProgress(save.id, human, target.id, progress);
        const view = yield* getClubSquad(savesDir, save.id, rival);
        return view.players.find((p) => p.id === target.id)!.overallRating;
      });

    const at0 = yield* overallAt(0);
    const at50 = yield* overallAt(50);
    const at100 = yield* overallAt(100);

    ok(isRange(at0), "progress 0 should publish a Range");
    ok(isRange(at50), "progress 50 should publish a Range");
    strictEqual(at100._tag, "exact", "progress 100 should publish the exact figure");

    if (isRange(at0) && isRange(at50)) {
      ok(at50.low >= at0.low, `low bound must not fall: ${at50.low} >= ${at0.low}`);
      ok(at50.high <= at0.high, `high bound must not rise: ${at50.high} <= ${at0.high}`);
    }
    if (at100._tag === "exact" && isRange(at0)) {
      ok(
        at0.low <= at100.value && at100.value <= at0.high,
        "the exact figure must fall inside the widest published Range",
      );
    }
  }),
);

it.effect("a Fully Scouted rival reads the exact figures the Player read publishes for him", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Club Squad");
    const rival = yield* withSave(save.id, aRivalClub);
    const human = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const client = yield* SqlClient;
        const rows = yield* client<{ id: ClubId }>`
          SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
        return rows[0]!.id;
      }),
    );

    const target = (yield* getClubSquad(savesDir, save.id, rival)).players[0]!;
    yield* setScoutingProgress(save.id, human, target.id, 100);

    const view = yield* getClubSquad(savesDir, save.id, rival);
    const scouted = view.players.find((p) => p.id === target.id)!;
    strictEqual(scouted.overallRating._tag, "exact");

    // The same Player at the same progress, read through the Profile seam — an independent
    // implementation of the same shared rule. Two surfaces cannot disagree about one Player; at
    // Fully Scouted both collapse to the exact figures the manager's own-squad view shows.
    const profile = yield* getPlayerProfile(savesDir, save.id, target.id);
    strictEqual(profile.overallRating._tag, "exact");
    const squadOverall = scouted.overallRating;
    const profileOverall = profile.overallRating;
    if (squadOverall._tag === "exact" && profileOverall._tag === "exact") {
      strictEqual(squadOverall.value, profileOverall.value);
    }
    for (const [attribute, figure] of Object.entries(scouted.attributes)) {
      if (figure === undefined) continue;
      strictEqual(figure._tag, "exact", `Fully Scouted ${attribute} should read exact`);
      const profileFigure = profile.attributes[attribute];
      ok(profileFigure !== undefined, `profile should carry ${attribute}`);
      if (figure._tag === "exact" && profileFigure !== undefined && profileFigure._tag === "exact") {
        strictEqual(figure.value, profileFigure.value, `${attribute} should agree with the Player read`);
      }
    }
  }),
);

it.effect("fails with ClubNotFoundError for a club the save does not hold", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Club Squad");

    const outcome = yield* getClubSquad(
      savesDir,
      save.id,
      ClubId.make("club_nowhere_9_99"),
    ).pipe(Effect.catchTag("ClubNotFoundError", (error) => Effect.succeed(error)));

    expect(outcome).toMatchObject({ _tag: "ClubNotFoundError" });
  }),
);