import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { TRANSFER_BUDGET_BY_TIER, WAGE_BUDGET_BY_TIER, transferValue, type KnownFigure } from "@cm-clone/shared";
import { BidId, PlayerId } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { advanceThroughBoundary } from "../boundary-helpers.js";
import { createSave } from "../../seeded-save.js";
import { getSquad } from "../../../src/main/club/index.js";
import { getPlayerContract } from "../../../src/main/career/player.js";
import { loadStreamEvents } from "../../../src/main/season/decider.js";
import { loadGameDate } from "../../../src/main/season/currentSeason.js";
import {
  decideAiSellerResponse,
  getTransfersScreen,
  loadAllPlayersEcon,
  placeBid,
  renewContract,
  respondAsBidder,
  respondToBid,
  signFreeAgent,
} from "../../../src/main/transfers/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-transfers-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: ':memory:' })),
    Effect.scoped,
  );

// ---------------------------------------------------------------------------
// Ticket 09 helpers: the market publishes `KnownFigure`s, never exact values below Fully Scouted,
// but the Bid threshold reads true values. Tests recompute the truth the way the command does
// (`loadAllPlayersEcon` + shared `transferValue` — the ai-clubs spec's pattern) and seed the
// scouting-progress rows the market read keys on.
// ---------------------------------------------------------------------------

/** The top of a published figure: the exact value, or the range's high bound. Bidding it is always
 *  at/above the true Transfer Value, so it clears the seller's accept threshold every time. */
const figureHigh = (figure: KnownFigure): number => (figure._tag === "exact" ? figure.value : figure.high);

/** The true Transfer Value of a player, recomputed from stored truth — never readable off the
 *  market response below Fully Scouted. */
const trueTransferValue = (playerId: PlayerId) =>
  Effect.gen(function* () {
    const players = yield* loadAllPlayersEcon(yield* loadGameDate);
    const player = players.find((p) => p.id === playerId);
    return player === undefined
      ? null
      : transferValue(player.overallRating, player.age, player.potentialAbility);
  });

// ---------------------------------------------------------------------------
// Pure AI-seller decision
// ---------------------------------------------------------------------------

it.effect("decideAiSellerResponse accepts outright at/above Transfer Value", () =>
  Effect.sync(() => {
    deepStrictEqual(decideAiSellerResponse(1_000, 1_000), { action: "accept", counterAmount: null });
    deepStrictEqual(decideAiSellerResponse(1_500, 1_000), { action: "accept", counterAmount: null });
  }),
);

it.effect("decideAiSellerResponse counters at exactly Transfer Value between 0.85x-1.0x", () =>
  Effect.sync(() => {
    const decision = decideAiSellerResponse(900, 1_000);
    deepStrictEqual(decision, { action: "counter", counterAmount: 1_000 });
  }),
);

it.effect("decideAiSellerResponse rejects outright below 0.85x", () =>
  Effect.sync(() => {
    deepStrictEqual(decideAiSellerResponse(800, 1_000), { action: "reject", counterAmount: null });
  }),
);

// ---------------------------------------------------------------------------
// Budgets derived from Stature Tier at Season start, visible via getTransfersScreen
// ---------------------------------------------------------------------------

it.effect("Transfer/Wage Budgets are derived from Stature Tier at Season start", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    const screen = yield* getTransfersScreen(savesDir, save.id);

    strictEqual(screen.club.id, squad.club.id);
    strictEqual(screen.transferBudgetRemaining, TRANSFER_BUDGET_BY_TIER[squad.club.statureTier]);
    strictEqual(screen.wageBudget, WAGE_BUDGET_BY_TIER[squad.club.statureTier]);
    ok(screen.wageBudgetUsed > 0, "the user's squad should already carry Contracts seeded at Season start");
    strictEqual(screen.windowOpen, true); // pre_season
  }),
);

// ---------------------------------------------------------------------------
// Window gating
// ---------------------------------------------------------------------------

it.effect("placeBid is rejected once the Transfer Window has closed", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const target = screen.marketPlayers[0];
    ok(target, "expected at least one other club's player on the market");

    yield* advanceThroughBoundary(savesDir, save.id); // resolves Matchday 1, closes the pre-season window

    const closedScreen = yield* getTransfersScreen(savesDir, save.id);
    strictEqual(closedScreen.windowOpen, false);

    const result = yield* Effect.exit(placeBid(savesDir, save.id, target.id, figureHigh(target.transferValue)));
    ok(result._tag === "Failure");
  }),
);

it.effect("signFreeAgent and renewContract are rejected outside an open window", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    yield* advanceThroughBoundary(savesDir, save.id); // closes the pre-season window

    const signResult = yield* Effect.exit(signFreeAgent(savesDir, save.id, PlayerId.make("nonexistent-player"), undefined));
    ok(signResult._tag === "Failure");

    const renewResult = yield* Effect.exit(
      renewContract(savesDir, save.id, squad.players[0]!.id, undefined),
    );
    ok(renewResult._tag === "Failure");
  }),
);

// ---------------------------------------------------------------------------
// Bid flow: single counter-offer round
// ---------------------------------------------------------------------------

it.effect("placeBid at/above Transfer Value completes the transfer immediately, recorded once", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTransfersScreen(savesDir, save.id);
    const target = before.marketPlayers[0];
    ok(target);

    // The top of the published range is at/above the true value, so it clears the accept branch.
    const amount = figureHigh(target.transferValue);
    const bid = yield* placeBid(savesDir, save.id, target.id, amount);
    strictEqual(bid.status, "accepted");
    strictEqual(bid.sellingClubId, target.clubId);
    strictEqual(bid.biddingClubId, before.club.id);

    const after = yield* getTransfersScreen(savesDir, save.id);
    strictEqual(after.transferBudgetRemaining, before.transferBudgetRemaining - amount);

    const squadAfter = yield* getSquad(savesDir, save.id);
    ok(squadAfter.players.some((player) => player.id === target.id), "bought player should now be in the squad");

    // CompleteTransfer wrote to both clubs' "club" streams atomically (ADR-0007/ticket 16).
    // The buyer is the human's club, so its own stream still carries the moment — that stream is
    // what the news inbox reads.
    const buyerEvents = yield* withSave(save.id, loadStreamEvents("club", before.club.id));
    ok(buyerEvents.some((event) => event.tag === "PlayerTransferredIn"));

    // The seller is an AI club and no longer has a stream at all. The transfer is recorded once,
    // authoritatively, in `player_transfers` — which is what a career history is read from.
    const sellerEvents = yield* withSave(save.id, loadStreamEvents("club", target.clubId!));
    strictEqual(sellerEvents.length, 0);
    const recorded = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        return yield* sql<{ fromClubId: string | null; toClubId: string; fee: number }>`
          SELECT from_club_id as "fromClubId", to_club_id as "toClubId", fee
          FROM player_transfers WHERE player_id = ${target.id}`;
      }),
    );
    strictEqual(recorded.length, 1);
    strictEqual(recorded[0]!.fromClubId, target.clubId);
    strictEqual(recorded[0]!.toClubId, before.club.id);
  }),
);

it.effect("a below-value placeBid comes back countered, and the bidder can accept the counter", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTransfersScreen(savesDir, save.id);
    const target = before.marketPlayers.find((p) => p.transferValue._tag !== "exact");
    ok(target);

    // The true value (recomputed, never published below Fully Scouted) puts the bid in the
    // 0.85x-1.0x counter band; the counter equals that true value.
    const trueValue = yield* withSave(save.id, trueTransferValue(target.id));
    ok(trueValue !== null);
    const lowAmount = Math.round(trueValue * 0.9);
    const bid = yield* placeBid(savesDir, save.id, target.id, lowAmount);
    strictEqual(bid.status, "countered");
    strictEqual(bid.counterAmount, trueValue);

    const accepted = yield* respondAsBidder(savesDir, save.id, bid.id, "accept");
    ok(accepted.outgoingBids.some((b) => b.id === bid.id && b.status === "accepted"));

    const after = yield* getTransfersScreen(savesDir, save.id);
    strictEqual(after.transferBudgetRemaining, before.transferBudgetRemaining - trueValue);
  }),
);

it.effect("a below-value placeBid can instead be withdrawn by the bidder", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTransfersScreen(savesDir, save.id);
    const target = before.marketPlayers.find((p) => p.transferValue._tag !== "exact");
    ok(target);

    const trueValue = yield* withSave(save.id, trueTransferValue(target.id));
    ok(trueValue !== null);
    const bid = yield* placeBid(savesDir, save.id, target.id, Math.round(trueValue * 0.9));
    strictEqual(bid.status, "countered");

    const withdrawn = yield* respondAsBidder(savesDir, save.id, bid.id, "withdraw");
    ok(withdrawn.outgoingBids.some((b) => b.id === bid.id && b.status === "withdrawn"));

    const after = yield* getTransfersScreen(savesDir, save.id);
    strictEqual(after.transferBudgetRemaining, before.transferBudgetRemaining); // unspent
  }),
);

it.effect("a very low placeBid is rejected outright", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTransfersScreen(savesDir, save.id);
    const target = before.marketPlayers.find((p) => p.transferValue._tag !== "exact");
    ok(target);

    const trueValue = yield* withSave(save.id, trueTransferValue(target.id));
    ok(trueValue !== null);
    const bid = yield* placeBid(savesDir, save.id, target.id, Math.round(trueValue * 0.5));
    strictEqual(bid.status, "rejected");
  }),
);

it.effect("respondToBid lets the user's club, as seller, accept/reject/counter an incoming Bid", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const club = screen.club;
    const otherClubId = screen.marketPlayers[0]!.clubId!;
    const myPlayerId = (yield* getSquad(savesDir, save.id)).players[0]!.id;

    // Simulate an incoming Bid from another club directly (no AI-bid-origination automation is
    // built in this ticket — see transfers.ts's `placeBid` doc comment).
    yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`INSERT INTO bids (id, player_id, selling_club_id, bidding_club_id, amount, counter_amount, status, season_number)
          VALUES ('test-bid-1', ${myPlayerId}, ${club.id}, ${otherClubId}, 1, NULL, 'pending', 1)`;
      }),
    );

    const rejected = yield* respondToBid(savesDir, save.id, BidId.make("test-bid-1"), "reject", undefined);
    ok(rejected.incomingBids.some((b) => b.id === "test-bid-1" && b.status === "rejected"));
  }),
);

it.effect("respondToBid rejects a second response once a Bid is already resolved", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const club = screen.club;
    const otherClubId = screen.marketPlayers[0]!.clubId!;
    const myPlayerId = (yield* getSquad(savesDir, save.id)).players[0]!.id;

    yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`INSERT INTO bids (id, player_id, selling_club_id, bidding_club_id, amount, counter_amount, status, season_number)
          VALUES ('test-bid-2', ${myPlayerId}, ${club.id}, ${otherClubId}, 1, NULL, 'pending', 1)`;
      }),
    );

    yield* respondToBid(savesDir, save.id, BidId.make("test-bid-2"), "reject", undefined);
    const result = yield* Effect.exit(respondToBid(savesDir, save.id, BidId.make("test-bid-2"), "accept", undefined));
    ok(result._tag === "Failure");
  }),
  20_000,
);

// ---------------------------------------------------------------------------
// Signing / wage-cap enforcement
// ---------------------------------------------------------------------------

it.effect("signFreeAgent signs a Free Agent for Credits 0, no Bid step, at a formula-derived wage", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const club = (yield* getTransfersScreen(savesDir, save.id)).club;

    // Free a player directly to simulate a post-expiry Free Agent (no multi-season rollover exists
    // yet to exercise `expireContractsForSeason` end-to-end from `createSave` — see season.ts).
    const otherPlayerId = (yield* getTransfersScreen(savesDir, save.id)).marketPlayers[0]!.id;
    yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`UPDATE players SET club_id = NULL WHERE id = ${otherPlayerId}`;
        yield* sql`DELETE FROM contracts WHERE player_id = ${otherPlayerId}`;
      }),
    );

    const before = yield* getTransfersScreen(savesDir, save.id);
    ok(before.freeAgents.some((p) => p.id === otherPlayerId));

    const after = yield* signFreeAgent(savesDir, save.id, otherPlayerId, 2);
    ok(!after.freeAgents.some((p) => p.id === otherPlayerId));
    strictEqual(after.transferBudgetRemaining, before.transferBudgetRemaining); // Credits 0
    ok(after.wageBudgetUsed > before.wageBudgetUsed);

    const squad = yield* getSquad(savesDir, save.id);
    ok(squad.players.some((player) => player.id === otherPlayerId));

    strictEqual(club.id, squad.club.id);
  }),
);

it.effect("signing/renewing is rejected once it would exceed the club's Wage Budget", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const otherPlayerId = (yield* getTransfersScreen(savesDir, save.id)).marketPlayers[0]!.id;
    yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`UPDATE players SET club_id = NULL WHERE id = ${otherPlayerId}`;
        yield* sql`DELETE FROM contracts WHERE player_id = ${otherPlayerId}`;
        // Blow the user's Wage Budget so any further wage commitment overflows it.
        yield* sql`UPDATE club_budgets SET wage_budget = 0 WHERE club_id = (SELECT id FROM clubs WHERE is_user_club = 1)`;
      }),
    );

    const result = yield* Effect.exit(signFreeAgent(savesDir, save.id, otherPlayerId, undefined));
    ok(result._tag === "Failure");
  }),
);

it.effect("renewContract refuses a mid-term Contract — a Contract renews only in its last year", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    const playerId = squad.players[0]!.id;

    // A freshly generated Contract stands mid-term, so renewal must be refused under the
    // last-year rule (Agent Note 2026-09-19, decision request 01).
    const result = yield* Effect.result(renewContract(savesDir, save.id, playerId, 5));
    ok(Result.isFailure(result));
    if (Result.isFailure(result)) {
      strictEqual(result.failure._tag, "ContractRenewalNotDueError");
      strictEqual(
        (result.failure as { readonly yearsRemaining: number }).yearsRemaining > 1,
        true,
      );
    }

    // The refusal changed nothing: the squad still holds the player at the same wage.
    const stillInSquad = yield* getSquad(savesDir, save.id);
    ok(stillInSquad.players.some((p) => p.id === playerId));
  }),
);

it.effect("renewContract renews a last-year Contract at the formula wage for the chosen length", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    const playerId = squad.players[0]!.id;

    yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`UPDATE contracts SET years_remaining = 1 WHERE player_id = ${playerId}`;
      }),
    );

    const renewed = yield* renewContract(savesDir, save.id, playerId, 5);
    ok(renewed.wageBudgetUsed > 0);

    const contract = yield* getPlayerContract(savesDir, save.id, playerId);
    strictEqual(contract.lengthYears, 5);
    strictEqual(contract.expiryDate, `Season ${1 + contract.lengthYears}`);
  }),
);

it.effect("renewContract rejects a player who doesn't belong to the user's club", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const otherPlayerId = (yield* getTransfersScreen(savesDir, save.id)).marketPlayers[0]!.id;

    const result = yield* Effect.exit(renewContract(savesDir, save.id, otherPlayerId, undefined));
    ok(result._tag === "Failure");
  }),
);
