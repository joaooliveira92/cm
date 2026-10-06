import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { transferValue, type KnownFigure } from "@cm-clone/shared";
import type { MarketPlayerView, PlayerId, SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { getSquad } from "../../../src/main/club/index.js";
import { getTransfersScreen, loadAllPlayersEcon } from "../../../src/main/transfers/index.js";
import { loadGameDate } from "../../../src/main/season/currentSeason.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-market-knowledge-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/** The human club's Scouting Progress on a player, seeded so the market read narrows. */
const setScoutingProgress = (saveId: string, clubId: string, playerId: PlayerId, progress: number) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`DELETE FROM scouting_progress WHERE club_id = ${clubId} AND player_id = ${playerId}`;
      yield* sql`INSERT INTO scouting_progress (club_id, player_id, progress) VALUES (${clubId}, ${playerId}, ${progress})`;
    }),
  );

/** The published figure for `playerId` on a fresh screen read. */
const marketFigureOf = (saveId: SaveId, playerId: PlayerId) =>
  Effect.gen(function* () {
    const screen = yield* getTransfersScreen(savesDir, saveId);
    const view =
      screen.marketPlayers.find((p) => p.id === playerId) ??
      screen.freeAgents.find((p) => p.id === playerId);
    ok(view, "expected the player on the market or Free Agent list");
    return view as MarketPlayerView;
  });

/** The true figures behind the published read — recomputed from stored truth, the way the Bid
 *  threshold reads them; never obtainable off the market response below Fully Scouted. */
const trueFiguresOf = (saveId: SaveId, playerId: PlayerId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const players = yield* loadAllPlayersEcon(yield* loadGameDate);
      const player = players.find((p) => p.id === playerId);
      ok(player, "expected the player in the store");
      return {
        overallRating: player.overallRating,
        transferValue: transferValue(player.overallRating, player.age, player.potentialAbility),
      };
    }),
  );

const isRange = (figure: KnownFigure): figure is { _tag: "range"; low: number; high: number } =>
  figure._tag === "range";

it.effect(
  "an unscouted rival and an unscouted Free Agent publish Ranges; Fully Scouted publishes exact figures",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Test Career");
      const screen = yield* getTransfersScreen(savesDir, save.id);
      const rival = screen.marketPlayers[0];
      ok(rival);

      // AC1 (rival half): a fresh save is entirely Unscouted, so every figure is a Range.
      ok(isRange(rival.overallRating), "unscouted rival OVR should be a Range");
      ok(isRange(rival.transferValue), "unscouted rival Value should be a Range");

      // AC1 (Free Agent half): free the same player, read again — still a Range.
      yield* withSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          yield* sql`UPDATE players SET club_id = NULL WHERE id = ${rival.id}`;
          yield* sql`DELETE FROM contracts WHERE player_id = ${rival.id}`;
        }),
      );
      const freed = yield* marketFigureOf(save.id, rival.id);
      const freedScreen = yield* getTransfersScreen(savesDir, save.id);
      ok(freedScreen.freeAgents.some((p) => p.id === rival.id), "the freed player should be a Free Agent");
      ok(isRange(freed.overallRating), "unscouted Free Agent OVR should be a Range");
      ok(isRange(freed.transferValue), "unscouted Free Agent Value should be a Range");

      // AC1 (Fully Scouted half): the same player, now at progress 100, reads exact.
      yield* setScoutingProgress(save.id, screen.club.id, rival.id, 100);
      const scouted = yield* marketFigureOf(save.id, rival.id);
      strictEqual(scouted.overallRating._tag, "exact");
      strictEqual(scouted.transferValue._tag, "exact");
      const truth = yield* trueFiguresOf(save.id, rival.id);
      if (scouted.overallRating._tag === "exact") {
        strictEqual(scouted.overallRating.value, truth.overallRating);
      }
      if (scouted.transferValue._tag === "exact") {
        strictEqual(scouted.transferValue.value, truth.transferValue);
      }
    }),
  20_000,
);

it.effect("the published Range narrows as Scouting Progress rises and never widens, at 0, 50 and 100", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const target = screen.marketPlayers[0];
    ok(target);

    const figureAt = (progress: number) =>
      Effect.gen(function* () {
        yield* setScoutingProgress(save.id, screen.club.id, target.id, progress);
        const view = yield* marketFigureOf(save.id, target.id);
        return view.overallRating;
      });

    const at0 = yield* figureAt(0);
    const at50 = yield* figureAt(50);
    const at100 = yield* figureAt(100);

    ok(isRange(at0), "progress 0 should publish a Range");
    ok(isRange(at50), "progress 50 should publish a Range");
    strictEqual(at100._tag, "exact", "progress 100 should publish the exact figure");

    if (isRange(at0) && isRange(at50)) {
      ok(at50.low >= at0.low, `low bound must not fall: ${at50.low} >= ${at0.low}`);
      ok(at50.high <= at0.high, `high bound must not rise: ${at50.high} <= ${at0.high}`);
      ok(
        at50.high - at50.low < at0.high - at0.low,
        `the band must narrow with progress: ${at50.high - at50.low} < ${at0.high - at0.low}`,
      );
    }
    if (at100._tag === "exact" && isRange(at0)) {
      ok(
        at0.low <= at100.value && at100.value <= at0.high,
        "the exact figure must fall inside the widest published Range",
      );
    }
  }),
);

it.effect("the manager's own Players are exact and never listed on the market", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const squad = yield* getSquad(savesDir, save.id);

    // AC3: own squad figures are unchanged (still plain exact numbers, no figure union here).
    ok(squad.players.length > 0);
    ok(squad.players.every((p) => typeof p.overallRating === "number"));

    // And none of them appears on either market list — the read filters own club out.
    const ownIds = new Set(squad.players.map((p) => p.id));
    ok(screen.marketPlayers.every((p) => !ownIds.has(p.id)));
    ok(screen.freeAgents.every((p) => !ownIds.has(p.id)));
  }),
);

it.effect("the market response carries no exact figure for any player below Fully Scouted", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");

    // Seed one rival at 99 — one short of Fully Scouted, the band already collapsed to the same
    // number at both ends but still published as a Range (AC5: no exact figure leaks).
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const target = screen.marketPlayers[0];
    ok(target);
    yield* setScoutingProgress(save.id, screen.club.id, target.id, 99);

    const after = yield* getTransfersScreen(savesDir, save.id);
    for (const player of [...after.marketPlayers, ...after.freeAgents]) {
      // Everything reads as a Range: one rival sits at 99, everything else is Unscouted, and no
      // scouting has been done at 100 anywhere in the save.
      ok(isRange(player.overallRating), `${player.firstName} OVR leaked an exact figure`);
      ok(isRange(player.transferValue), `${player.firstName} Value leaked an exact figure`);
    }
  }),
  20_000,
);