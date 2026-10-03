import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import type { PlayerId, SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { getPlayerProfile } from "../../../src/main/career/index.js";
import { getClubSquad } from "../../../src/main/club/index.js";
import { getTeamScoutReport } from "../../../src/main/club/teamScoutReport.js";
import {
  getContractOffer,
  getPlayerComparison,
  getPlayerSearch,
  getTransfersScreen,
} from "../../../src/main/transfers/index.js";

/**
 * One player's knowledge, read by every screen that shows that player (group-j ticket 09, review
 * finding 2).
 *
 * Each read below is a correct implementation of the same rule on its own, and that is exactly the
 * problem: the rule was spelled out once per query, so a screen could tighten a band, drop the
 * own-squad case or read a stale ledger and every one of its own tests would still pass. This spec
 * holds the readers to each other instead — the same player, the same save, the same progress, and
 * one set of figures that has to come back identical from the market, the offer, the search, the
 * comparison, a rival's squad, a scout report and the Player Profile.
 *
 * One asymmetry shapes the cases below: the Profile refuses a Free Agent (`career/player.ts`) and
 * the offer serves Free Agents only, so those two can never be compared for the same player. The
 * offer is held against the other Free-Agent readers, and the Profile against the readers of a
 * player who is still at a club — which is what each of the two actually serves.
 */

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-knowledge-agreement-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: SaveId | string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const setScoutingProgress = (saveId: SaveId, clubId: string, playerId: PlayerId, progress: number) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`DELETE FROM scouting_progress WHERE club_id = ${clubId} AND player_id = ${playerId}`;
      yield* sql`INSERT INTO scouting_progress (club_id, player_id, progress) VALUES (${clubId}, ${playerId}, ${progress})`;
    }),
  );

/** Release one rival from their club, so the reads that answer for Free Agents have one to read.
 *  Returns their id, and the club they left so the club-scoped reads can be pointed at it. */
const releaseSomePlayer = (saveId: SaveId) =>
  Effect.gen(function* () {
    const target = (yield* getTransfersScreen(savesDir, saveId)).marketPlayers[0];
    ok(target, "a fresh save has rival players");
    ok(target.clubId !== null, "a rival is at a club");
    yield* withSave(
      saveId,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`UPDATE players SET club_id = NULL WHERE id = ${target.id}`;
        yield* sql`DELETE FROM contracts WHERE player_id = ${target.id}`;
      }),
    );
    return { playerId: target.id, formerClubId: target.clubId };
  });

/** Every read of one player's figures, as the two the screens actually display. The comparison row
 *  and the search row publish Overall Rating and Transfer Value; the offer publishes those two and
 *  the wage, which no other screen shows (the market has no Wage column). */
const everyRead = (saveId: SaveId, playerId: PlayerId) =>
  Effect.gen(function* () {
    const offer = yield* getContractOffer(savesDir, saveId, playerId);
    const market = (yield* getTransfersScreen(savesDir, saveId)).freeAgents.find(
      (player) => player.id === playerId,
    );
    ok(market, "the free agent is on the market");
    const search = (yield* getPlayerSearch(savesDir, saveId, { name: `${offer.firstName} ${offer.lastName}` }))
      .results.find((player) => player.id === playerId);
    ok(search, "the free agent is in the search results");
    const comparison = (yield* getPlayerComparison(savesDir, saveId, [playerId])).rows.find(
      (row) => row.id === playerId,
    );
    ok(comparison, "the free agent is in the comparison");
    return { offer, market, search, comparison };
  });

it.effect(
  "one player's figures read the same from the market, the offer, the search and the comparison",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Test Career");
      const { club } = yield* getTransfersScreen(savesDir, save.id);
      const { playerId } = yield* releaseSomePlayer(save.id);

      // Part-way scouted, so the figures are bands: a reader that forgot to read the ledger at all,
      // or read it as exact, disagrees here rather than agreeing on a player nobody knows.
      yield* setScoutingProgress(save.id, club.id, playerId, 50);
      const reads = yield* everyRead(save.id, playerId);

      deepStrictEqual(reads.market.overallRating, reads.offer.overallRating, "OVR: market vs offer");
      deepStrictEqual(reads.market.transferValue, reads.offer.transferValue, "Value: market vs offer");
      deepStrictEqual(reads.search.overallRating, reads.offer.overallRating, "OVR: search vs offer");
      deepStrictEqual(reads.search.transferValue, reads.offer.transferValue, "Value: search vs offer");
      deepStrictEqual(
        reads.comparison.overallRating,
        reads.offer.overallRating,
        "OVR: comparison vs offer",
      );
      deepStrictEqual(
        reads.comparison.transferValue,
        reads.offer.transferValue,
        "Value: comparison vs offer",
      );

      // And the shape of the knowledge, not just the values: nobody publishes a bare number for a
      // player the club has not finished scouting.
      for (const [label, figure] of [
        ["market", reads.market.overallRating],
        ["offer", reads.offer.overallRating],
        ["search", reads.search.overallRating],
        ["comparison", reads.comparison.overallRating],
      ] as const) {
        strictEqual(figure._tag, "range", `${label} ranges a half-scouted player's OVR`);
      }
    }),
  30_000,
);

it.effect("the same player reads the same way Fully Scouted as unscouted — only narrower", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const { club } = yield* getTransfersScreen(savesDir, save.id);
    const { playerId } = yield* releaseSomePlayer(save.id);

    const unscouted = yield* everyRead(save.id, playerId);
    yield* setScoutingProgress(save.id, club.id, playerId, 100);
    const scouted = yield* everyRead(save.id, playerId);

    for (const [label, figure] of [
      ["market", scouted.market.overallRating],
      ["offer", scouted.offer.overallRating],
      ["search", scouted.search.overallRating],
      ["comparison", scouted.comparison.overallRating],
    ] as const) {
      strictEqual(figure._tag, "exact", `${label} is exact at Fully Scouted`);
    }
    if (unscouted.offer.overallRating._tag !== "range") return;
    if (scouted.offer.overallRating._tag !== "exact") return;
    ok(
      scouted.offer.overallRating.value >= unscouted.offer.overallRating.low &&
        scouted.offer.overallRating.value <= unscouted.offer.overallRating.high,
      "the exact figure is the one the band was drawn around",
    );
  }),
  30_000,
);

it.effect("a rival's Squad reads their figures exactly as the market does", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTransfersScreen(savesDir, save.id);
    const target = before.marketPlayers[0];
    ok(target, "a fresh save has rivals on the market");
    const targetClubId = target.clubId;
    ok(targetClubId !== null, "a rival is at a club");

    // Half-scouted, so a squad that defaulted to 0 or to exact disagrees with the market. Read
    // *after* the ledger changes on both sides: a comparison against a pre-change market row would
    // pass for a squad that never read the ledger at all.
    yield* setScoutingProgress(save.id, before.club.id, target.id, 50);
    const { marketPlayers } = yield* getTransfersScreen(savesDir, save.id);
    const rival = marketPlayers.find((player) => player.id === target.id);
    ok(rival, "the rival is still on the market");

    const squad = yield* getClubSquad(savesDir, save.id, targetClubId);
    const squadPlayer = squad.players.find((player) => player.id === rival.id);
    ok(squadPlayer, "the rival is in their club's squad");
    deepStrictEqual(
      squadPlayer.overallRating,
      rival.overallRating,
      "the same club, the same progress, the same band",
    );
    strictEqual(squadPlayer.overallRating._tag, "range", "and it is a band at half progress");
  }),
  30_000,
);

it.effect("a Team Scout Report reads the ledger row the other readers do", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const { club, marketPlayers } = yield* getTransfersScreen(savesDir, save.id);
    const target = marketPlayers[0];
    ok(target, "a fresh save has rivals on the market");
    const targetClubId = target.clubId;
    ok(targetClubId !== null, "a rival is at a club");

    // The whole target squad watched to the same progress, so the report's key players are drawn
    // from rows that exist. A report whose scoped load missed the ledger would report 0 for all of
    // them; one that read only the first row would report 50 for one and 0 for the rest.
    const squad = yield* getClubSquad(savesDir, save.id, targetClubId);
    ok(squad.players.length > 1, "a rival club has a squad of more than one");
    for (const player of squad.players) {
      yield* setScoutingProgress(save.id, club.id, player.id, 50);
    }

    // The report publishes its own band (`abilityLow`/`abilityHigh`, derived by the report's rule
    // rather than `figureByProgress`), so what it must agree with is the progress it read: the same
    // rows the market and the squad resolve.
    const report = yield* getTeamScoutReport(savesDir, save.id, targetClubId);
    ok(report.keyPlayers.length > 0, "a watched target has key players to report");
    for (const player of report.keyPlayers) {
      strictEqual(player.progress, 50, `the report read the ledger row for ${player.playerId}`);
    }
  }),
  30_000,
);

it.effect("the Player Profile reads a rival's figures the way the market, search and squad do", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTransfersScreen(savesDir, save.id);
    const target = before.marketPlayers[0];
    ok(target, "a fresh save has rivals on the market");
    const targetClubId = target.clubId;
    ok(targetClubId !== null, "a rival is at a club");

    // Half-scouted, so a Profile that read the ledger as exact — or not at all — disagrees here
    // rather than agreeing on a player nobody has looked at. Read *after* the ledger changes, for
    // the same reason the squad case does.
    yield* setScoutingProgress(save.id, before.club.id, target.id, 50);
    const { marketPlayers } = yield* getTransfersScreen(savesDir, save.id);
    const rival = marketPlayers.find((player) => player.id === target.id);
    ok(rival, "the rival is still on the market");

    // The one comparison this spec cannot make is offer-vs-profile: the Profile refuses a Free
    // Agent and the offer serves Free Agents only. What the Profile does serve is a player at a
    // club, and for those it is held to every other reader of the same player.
    const profile = yield* getPlayerProfile(savesDir, save.id, target.id);
    const search = (
      yield* getPlayerSearch(savesDir, save.id, { name: `${profile.firstName} ${profile.lastName}` })
    ).results.find((player) => player.id === target.id);
    ok(search, "the rival is in the search results");
    const squad = yield* getClubSquad(savesDir, save.id, targetClubId);
    const squadPlayer = squad.players.find((player) => player.id === target.id);
    ok(squadPlayer, "the rival is in their club's squad");

    deepStrictEqual(profile.overallRating, rival.overallRating, "OVR: profile vs market");
    deepStrictEqual(profile.transferValue, rival.transferValue, "Value: profile vs market");
    deepStrictEqual(profile.overallRating, search.overallRating, "OVR: profile vs search");
    deepStrictEqual(profile.transferValue, search.transferValue, "Value: profile vs search");
    // Overall Rating only: the squad view publishes no Value, so there is nothing to agree with.
    deepStrictEqual(profile.overallRating, squadPlayer.overallRating, "OVR: profile vs squad");
    strictEqual(profile.overallRating._tag, "range", "and the profile bands a half-scouted player");

    // The same read narrows to exact at Fully Scouted, and the market narrows with it — a Profile
    // that went exact alone would be the disagreement this catches.
    yield* setScoutingProgress(save.id, before.club.id, target.id, 100);
    const scouted = yield* getPlayerProfile(savesDir, save.id, target.id);
    const scoutedRival = (yield* getTransfersScreen(savesDir, save.id)).marketPlayers.find(
      (player) => player.id === target.id,
    );
    ok(scoutedRival, "the rival is still on the market");
    strictEqual(scouted.overallRating._tag, "exact", "the profile is exact at Fully Scouted");
    deepStrictEqual(
      scouted.overallRating,
      scoutedRival.overallRating,
      "OVR: scouted profile vs market",
    );
    if (profile.overallRating._tag !== "range") return;
    if (scouted.overallRating._tag !== "exact") return;
    ok(
      scouted.overallRating.value >= profile.overallRating.low &&
        scouted.overallRating.value <= profile.overallRating.high,
      "the exact figure is the one the band was drawn around",
    );
  }),
  30_000,
);
