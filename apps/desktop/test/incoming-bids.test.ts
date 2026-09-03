import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect, Exit } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import type { BidId, ClubId, PlayerId, SaveId } from "@cm-clone/contracts";
import { createSave } from "../src/main/saves.js";
import { getSquad } from "../src/main/squad.js";
import { advanceCalendar } from "../src/main/season.js";
import { aiPlaceBid, getTransfersScreen, respondToBid } from "../src/main/transfers.js";
import { loadStreamEvents } from "../src/main/decider.js";
import { getNewsInbox } from "../src/main/news.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-incoming-bids-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

interface BidRow {
  readonly id: string;
  readonly status: string;
  readonly amount: number;
  readonly playerId: string;
  readonly sellingClubId: string;
}

const allBids = (saveId: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      return yield* sql<BidRow>`
        SELECT id, status, amount, player_id as "playerId", selling_club_id as "sellingClubId"
        FROM bids ORDER BY id`;
    }),
  );

const bidsAgainstUser = (saveId: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      return yield* sql<BidRow>`
        SELECT b.id, b.status, b.amount, b.player_id as "playerId", b.selling_club_id as "sellingClubId"
        FROM bids b JOIN clubs c ON c.id = b.selling_club_id
        WHERE c.is_user_club = 1 ORDER BY b.id`;
    }),
  );

const clubStreamEvents = (saveId: string, clubId: string) =>
  loadStreamEvents("club", clubId).pipe(
    Effect.provide(
      SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true }),
    ),
    Effect.scoped,
  );

/**
 * Seeds one AI-club Bid for one of the human club's players, by calling the same
 * `aiPlaceBid` the transfer-window orchestration calls.
 *
 * Driving this through a real `runAiTransferWindow` would make the test depend on world-generation
 * luck: an AI club takes one target per weak Position and ranks free agents alongside squad players,
 * so which club it happens to bid against varies per save. Seeding the call directly is the same
 * controlled-substitute approach `boardObjectives.test.ts` uses for forcing a League finish — it
 * exercises the real code path with the world held still. The end-to-end test at the bottom is what
 * covers the orchestration actually reaching this.
 */
const seedBidForUserPlayer = (saveId: SaveId, amount = 1_000_000) =>
  Effect.gen(function* () {
    const squad = yield* getSquad(savesDir, saveId);
    const player = squad.players[0]!;
    const placed = yield* withSave(
      saveId,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const rows = yield* sql<{
          id: ClubId;
        }>`SELECT id FROM clubs WHERE is_user_club = 0 ORDER BY id LIMIT 1`;
        const buyer = rows[0]!.id;
        // Generated budgets are small enough that the first AI club often cannot complete the
        // transfer it is about to bid for. Funding it keeps these tests about the seller branch
        // rather than about budget arithmetic, which `transfers.test.ts` already covers.
        yield* sql`UPDATE club_budgets SET transfer_budget_remaining = 500000000, wage_budget = 5000000 WHERE club_id = ${buyer}`;
        const result = yield* aiPlaceBid(buyer, player.id as PlayerId, amount, 1);
        return { buyer, bidId: result!.id as string };
      }),
    );
    return {
      playerId: player.id,
      clubId: squad.club.id,
      buyer: placed.buyer,
      bidId: placed.bidId,
    };
  });

/** The seeded bid by id — never `[0]`, because an advance runs a transfer window that can add more. */
const bidById = (saveId: string, bidId: string) =>
  Effect.gen(function* () {
    const bids = yield* allBids(saveId);
    return bids.find((bid) => bid.id === bidId)!;
  });

// ---------------------------------------------------------------------------
// The seller side is reachable in play
// ---------------------------------------------------------------------------

it.effect("a bid for a human-club player is left for the manager to answer", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const seeded = yield* seedBidForUserPlayer(save.id);

    const bids = yield* bidsAgainstUser(save.id);
    strictEqual(bids.length, 1);
    strictEqual(bids[0]!.status, "pending", "no other seller in this game leaves a bid unanswered");
    strictEqual(bids[0]!.playerId, seeded.playerId);
  }),
);

it.effect("does not sell the player before the manager has answered", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const seeded = yield* seedBidForUserPlayer(save.id);

    const squad = yield* getSquad(savesDir, save.id);
    ok(
      squad.players.some((player) => player.id === seeded.playerId),
      "a pending bid must not move the player",
    );
  }),
);

it.effect("a bid between two AI clubs still resolves inside the command that placed it", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const { buyer, seller, playerId } = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const clubs = yield* sql<{
          id: ClubId;
        }>`SELECT id FROM clubs WHERE is_user_club = 0 ORDER BY id LIMIT 2`;
        const players = yield* sql<{
          id: PlayerId;
        }>`SELECT id FROM players WHERE club_id = ${clubs[1]!.id} LIMIT 1`;
        yield* sql`UPDATE club_budgets SET transfer_budget_remaining = 500000000, wage_budget = 5000000 WHERE club_id = ${clubs[0]!.id}`;
        return { buyer: clubs[0]!.id, seller: clubs[1]!.id, playerId: players[0]!.id };
      }),
    );

    yield* withSave(save.id, aiPlaceBid(buyer, playerId, 1_000_000, 1));

    const bids = yield* allBids(save.id);
    const placed = bids.find((bid) => bid.sellingClubId === seller)!;
    ok(placed !== undefined);
    ok(placed.status !== "pending", `an AI seller answers immediately, got ${placed.status}`);
  }),
);

it.effect("a pending bid reaches the Transfers screen as an incoming bid", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* seedBidForUserPlayer(save.id);

    const view = yield* getTransfersScreen(savesDir, save.id);
    strictEqual(view.incomingBids.length, 1, "incomingBids has never been non-empty in play before");
    strictEqual(view.incomingBids[0]!.status, "pending");
  }),
);

it.effect("records the arrival on the human club's stream", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const seeded = yield* seedBidForUserPlayer(save.id, 2_500_000);

    const events = yield* clubStreamEvents(save.id, seeded.clubId);
    const received = events.filter((event) => event.tag === "BidReceived");
    strictEqual(received.length, 1);

    const payload = received[0]!.payload as {
      readonly bidId: string;
      readonly playerId: string;
      readonly amount: number;
    };
    strictEqual(payload.playerId, seeded.playerId);
    strictEqual(payload.amount, 2_500_000);
    strictEqual(payload.bidId, (yield* bidsAgainstUser(save.id))[0]!.id);
  }),
);

it.effect("writes no arrival event for a bid the human club is not selling into", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    const { buyer, playerId } = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const clubs = yield* sql<{
          id: ClubId;
        }>`SELECT id FROM clubs WHERE is_user_club = 0 ORDER BY id LIMIT 2`;
        const players = yield* sql<{
          id: PlayerId;
        }>`SELECT id FROM players WHERE club_id = ${clubs[1]!.id} LIMIT 1`;
        yield* sql`UPDATE club_budgets SET transfer_budget_remaining = 500000000, wage_budget = 5000000 WHERE club_id = ${clubs[0]!.id}`;
        return { buyer: clubs[0]!.id, playerId: players[0]!.id };
      }),
    );

    yield* withSave(save.id, aiPlaceBid(buyer, playerId, 1_000_000, 1));

    const events = yield* clubStreamEvents(save.id, squad.club.id);
    strictEqual(events.filter((event) => event.tag === "BidReceived").length, 0);
  }),
);

// ---------------------------------------------------------------------------
// Answering
// ---------------------------------------------------------------------------

it.effect("accepting an incoming bid sells the player", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const seeded = yield* seedBidForUserPlayer(save.id);
    const bid = (yield* bidsAgainstUser(save.id))[0]!;

    yield* respondToBid(savesDir, save.id, bid.id as BidId, "accept", undefined);

    const after = yield* getSquad(savesDir, save.id);
    ok(
      !after.players.some((player) => player.id === seeded.playerId),
      "the player should have left the squad",
    );
    strictEqual((yield* bidsAgainstUser(save.id))[0]!.status, "accepted");
  }),
);

it.effect("rejecting keeps the player and closes the bid", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const seeded = yield* seedBidForUserPlayer(save.id);
    const bid = (yield* bidsAgainstUser(save.id))[0]!;

    yield* respondToBid(savesDir, save.id, bid.id as BidId, "reject", undefined);

    const after = yield* getSquad(savesDir, save.id);
    ok(after.players.some((player) => player.id === seeded.playerId));
    strictEqual((yield* bidsAgainstUser(save.id))[0]!.status, "rejected");
  }),
);

it.effect("countering hands the decision straight back to the AI bidder", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* seedBidForUserPlayer(save.id);
    const bid = (yield* bidsAgainstUser(save.id))[0]!;

    yield* respondToBid(savesDir, save.id, bid.id as BidId, "counter", bid.amount + 100_000);

    const settled = (yield* bidsAgainstUser(save.id))[0]!;
    ok(
      settled.status === "accepted" || settled.status === "withdrawn",
      `a counter is answered in the same command, got ${settled.status}`,
    );
  }),
);

it.effect("refuses a second answer to the same bid", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* seedBidForUserPlayer(save.id);
    const bid = (yield* bidsAgainstUser(save.id))[0]!;

    yield* respondToBid(savesDir, save.id, bid.id as BidId, "reject", undefined);
    const exit = yield* Effect.exit(
      respondToBid(savesDir, save.id, bid.id as BidId, "accept", undefined),
    );

    ok(Exit.isFailure(exit), "an answered bid is not answerable again");
    strictEqual((yield* bidsAgainstUser(save.id))[0]!.status, "rejected");
  }),
);

// ---------------------------------------------------------------------------
// Expiry: one Continue to answer
// ---------------------------------------------------------------------------

it.effect("a bid the manager ignores expires on the next advance", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const seeded = yield* seedBidForUserPlayer(save.id);

    yield* advanceCalendar(savesDir, save.id);

    strictEqual(
      (yield* bidById(save.id, seeded.bidId)).status,
      "expired",
      "an unanswered bid lapses rather than lingering across the season",
    );
  }),
);

it.effect("lapsing is not accepting — the player stays", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const seeded = yield* seedBidForUserPlayer(save.id);

    yield* advanceCalendar(savesDir, save.id);

    const squad = yield* getSquad(savesDir, save.id);
    ok(squad.players.some((player) => player.id === seeded.playerId));
  }),
);

it.effect("an answered bid is untouched by the next advance", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const seeded = yield* seedBidForUserPlayer(save.id);

    yield* respondToBid(savesDir, save.id, seeded.bidId as BidId, "reject", undefined);
    yield* advanceCalendar(savesDir, save.id);

    strictEqual(
      (yield* bidById(save.id, seeded.bidId)).status,
      "rejected",
      "expiry must only reach bids that are still pending",
    );
  }),
);

it.effect("an expired bid can no longer be answered", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* seedBidForUserPlayer(save.id);
    const bid = (yield* bidsAgainstUser(save.id))[0]!;

    yield* advanceCalendar(savesDir, save.id);
    const exit = yield* Effect.exit(
      respondToBid(savesDir, save.id, bid.id as BidId, "accept", undefined),
    );

    ok(Exit.isFailure(exit), "a lapsed bid is closed, not merely stale");
  }),
);

// ---------------------------------------------------------------------------
// End-to-end: the orchestration reaches the seller branch
// ---------------------------------------------------------------------------

/**
 * Free agents are signed rather than bid on, and 28% of a generated world's players are free agents,
 * so in an untouched save an AI club's one target per weak Position is usually a free signing and
 * league-wide bids are rare. Clearing the free-agent pool and lifting budgets makes the window bid
 * for squad players instead — which is what puts a real `runAiTransferWindow` through the seller
 * branch rather than through `aiPlaceBid` called directly.
 */
const clearFreeAgentsAndLiftBudgets = (saveId: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`DELETE FROM player_positions WHERE player_id IN (SELECT id FROM players WHERE club_id IS NULL)`;
      yield* sql`DELETE FROM player_fitness WHERE player_id IN (SELECT id FROM players WHERE club_id IS NULL)`;
      yield* sql`DELETE FROM players WHERE club_id IS NULL`;
      yield* sql`UPDATE club_budgets SET transfer_budget_remaining = 500000000, wage_budget = 5000000`;
    }),
  );

it.effect("a real transfer window never resolves a human-club bid on the manager's behalf", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* clearFreeAgentsAndLiftBudgets(save.id);

    // The pre-season window closes on this advance, which is where `runAiTransferWindow` fires.
    yield* advanceCalendar(savesDir, save.id);

    const bids = yield* allBids(save.id);
    ok(bids.length > 0, "the window should have produced bids");
    for (const bid of yield* bidsAgainstUser(save.id)) {
      strictEqual(
        bid.status,
        "pending",
        "a bid placed during this advance must survive the expiry step that ran at its start",
      );
    }
  }),
);

// ---------------------------------------------------------------------------
// The inbox reports the decision, and stops reporting it once it is answered
// ---------------------------------------------------------------------------

it.effect("a waiting bid reaches the News Inbox as an open decision", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* seedBidForUserPlayer(save.id, 2_500_000);

    const inbox = yield* getNewsInbox(savesDir, save.id);
    const message = inbox.messages.find((m) => m.actionState === "required");
    ok(message, "the pending bid should be the inbox's one open decision");
    strictEqual(message!.category, "transfer");
    strictEqual(message!.priority, "high");
    strictEqual(inbox.counts.actionRequired, 1);
    ok(message!.body.includes("£2.5m"));
  }),
);

it.effect("the message stops reading as open the moment the bid is answered", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const seeded = yield* seedBidForUserPlayer(save.id);

    yield* respondToBid(savesDir, save.id, seeded.bidId as BidId, "reject", undefined);

    const inbox = yield* getNewsInbox(savesDir, save.id);
    strictEqual(
      inbox.counts.actionRequired,
      0,
      "action state is read live off the bid, so answering it settles the message",
    );
    ok(inbox.messages.some((m) => m.actionState === "completed"));
  }),
);

it.effect("the message reads as lapsed after the bid expires", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const seeded = yield* seedBidForUserPlayer(save.id);

    yield* advanceCalendar(savesDir, save.id);

    const inbox = yield* getNewsInbox(savesDir, save.id);
    const lapsed = inbox.messages.find((m) => m.actionState === "expired");
    ok(lapsed, "an expired bid should still have a message, reading as lapsed");
    ok(lapsed!.body.includes("lapsed"));

    // Deliberately not asserting `actionRequired === 0`: the same advance runs the transfer window,
    // which guarantees the manager a fresh bid to answer. The lapsed one is what must stop counting.
    strictEqual(
      (yield* bidById(save.id, seeded.bidId)).status,
      "expired",
      "the seeded bid is the one that lapsed",
    );
  }),
);

/**
 * The guarantee pass exists so the manager always has something to answer. Its guard has to be about
 * *open* bids: counting every bid ever sent to the human club makes it fire once per career, because
 * the first window's bid is still on the table — answered or lapsed — for every window after it.
 */
it.effect("guarantees a fresh bid in a later window, not just the first one", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");

    const pendingCount = Effect.gen(function* () {
      const bids = yield* bidsAgainstUser(save.id);
      return bids.filter((bid) => bid.status === "pending").length;
    });

    // The pre-season window closes on the first advance.
    yield* advanceCalendar(savesDir, save.id);
    strictEqual(yield* pendingCount, 1, "the first window should leave a bid to answer");

    // Walk to the mid-season window. The next advance lapses the first bid; somewhere further on the
    // mid-season window opens and must produce another.
    let sawSecond = false;
    for (let advance = 0; advance < 30 && !sawSecond; advance += 1) {
      const outcome = yield* Effect.exit(advanceCalendar(savesDir, save.id));
      if (Exit.isFailure(outcome)) break;
      if ((yield* pendingCount) > 0) sawSecond = true;
    }

    ok(sawSecond, "a later transfer window must also leave the manager a bid to answer");
  }),
);
