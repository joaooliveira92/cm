import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { TRANSFER_BUDGET_BY_TIER, WAGE_BUDGET_BY_TIER } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { advanceCalendar } from "../src/main/season.js";
import { createSave } from "../src/main/saves.js";
import { getSquad } from "../src/main/squad.js";
import { loadStreamEvents } from "../src/main/decider.js";
import {
  decideAiSellerResponse,
  getTransfersScreen,
  placeBid,
  renewContract,
  respondAsBidder,
  respondToBid,
  signFreeAgent,
} from "../src/main/transfers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-transfers-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

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

    yield* advanceCalendar(savesDir, save.id); // resolves Matchday 1, closes the pre-season window

    const closedScreen = yield* getTransfersScreen(savesDir, save.id);
    strictEqual(closedScreen.windowOpen, false);

    const result = yield* Effect.exit(placeBid(savesDir, save.id, target.id, target.transferValue));
    ok(result._tag === "Failure");
  }),
);

it.effect("signFreeAgent and renewContract are rejected outside an open window", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    yield* advanceCalendar(savesDir, save.id); // closes the pre-season window

    const signResult = yield* Effect.exit(signFreeAgent(savesDir, save.id, "nonexistent-player", undefined));
    ok(signResult._tag === "Failure");

    const renewResult = yield* Effect.exit(
      renewContract(savesDir, save.id, squad.players[0].id, undefined),
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

    const bid = yield* placeBid(savesDir, save.id, target.id, target.transferValue);
    strictEqual(bid.status, "accepted");
    strictEqual(bid.sellingClubId, target.clubId);
    strictEqual(bid.biddingClubId, before.club.id);

    const after = yield* getTransfersScreen(savesDir, save.id);
    strictEqual(after.transferBudgetRemaining, before.transferBudgetRemaining - target.transferValue);

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
    const target = before.marketPlayers.find((p) => p.transferValue > 0);
    ok(target);

    const lowAmount = Math.round(target.transferValue * 0.9);
    const bid = yield* placeBid(savesDir, save.id, target.id, lowAmount);
    strictEqual(bid.status, "countered");
    strictEqual(bid.counterAmount, target.transferValue);

    const accepted = yield* respondAsBidder(savesDir, save.id, bid.id, "accept");
    ok(accepted.outgoingBids.some((b) => b.id === bid.id && b.status === "accepted"));

    const after = yield* getTransfersScreen(savesDir, save.id);
    strictEqual(after.transferBudgetRemaining, before.transferBudgetRemaining - target.transferValue);
  }),
);

it.effect("a below-value placeBid can instead be withdrawn by the bidder", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTransfersScreen(savesDir, save.id);
    const target = before.marketPlayers.find((p) => p.transferValue > 0);
    ok(target);

    const bid = yield* placeBid(savesDir, save.id, target.id, Math.round(target.transferValue * 0.9));
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
    const target = before.marketPlayers.find((p) => p.transferValue > 0);
    ok(target);

    const bid = yield* placeBid(savesDir, save.id, target.id, Math.round(target.transferValue * 0.5));
    strictEqual(bid.status, "rejected");
  }),
);

it.effect("respondToBid lets the user's club, as seller, accept/reject/counter an incoming Bid", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const club = screen.club;
    const otherClubId = screen.marketPlayers[0]!.clubId!;
    const myPlayerId = (yield* getSquad(savesDir, save.id)).players[0].id;

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

    const rejected = yield* respondToBid(savesDir, save.id, "test-bid-1", "reject", undefined);
    ok(rejected.incomingBids.some((b) => b.id === "test-bid-1" && b.status === "rejected"));
  }),
);

it.effect("respondToBid rejects a second response once a Bid is already resolved", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const club = screen.club;
    const otherClubId = screen.marketPlayers[0]!.clubId!;
    const myPlayerId = (yield* getSquad(savesDir, save.id)).players[0].id;

    yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`INSERT INTO bids (id, player_id, selling_club_id, bidding_club_id, amount, counter_amount, status, season_number)
          VALUES ('test-bid-2', ${myPlayerId}, ${club.id}, ${otherClubId}, 1, NULL, 'pending', 1)`;
      }),
    );

    yield* respondToBid(savesDir, save.id, "test-bid-2", "reject", undefined);
    const result = yield* Effect.exit(respondToBid(savesDir, save.id, "test-bid-2", "accept", undefined));
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

it.effect("renewContract reuses the signing flow against the player's current club", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    const playerId = squad.players[0].id;

    const renewed = yield* renewContract(savesDir, save.id, playerId, 5);
    ok(renewed.wageBudgetUsed > 0);

    const stillInSquad = yield* getSquad(savesDir, save.id);
    ok(stillInSquad.players.some((p) => p.id === playerId));
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
