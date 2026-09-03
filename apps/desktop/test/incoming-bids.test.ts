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
import type { BidId, SaveId } from "@cm-clone/contracts";
import { createSave } from "../src/main/saves.js";
import { getSquad } from "../src/main/squad.js";
import { advanceCalendar } from "../src/main/season.js";
import { getTransfersScreen, respondToBid } from "../src/main/transfers.js";
import { loadStreamEvents } from "../src/main/decider.js";

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

const bidsAgainstUser = (saveId: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      return yield* sql<BidRow>`
        SELECT b.id, b.status, b.amount, b.player_id as "playerId", b.selling_club_id as "sellingClubId"
        FROM bids b JOIN clubs c ON c.id = b.selling_club_id
        WHERE c.is_user_club = 1
        ORDER BY b.id`;
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
 * The pre-season window closes on the first advance, and that is where `runAiTransferWindow` fires.
 * Every test here needs at least one AI transfer window to have run.
 */
const firstAdvance = (saveId: SaveId) => advanceCalendar(savesDir, saveId);

// ---------------------------------------------------------------------------
// The seller side is reachable in play
// ---------------------------------------------------------------------------

it.effect("AI clubs leave bids for the human club's players pending", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* firstAdvance(save.id);

    const bids = yield* bidsAgainstUser(save.id);
    ok(bids.length > 0, "an AI transfer window should produce at least one bid for a user player");
    ok(
      bids.every((bid) => bid.status === "pending"),
      `every bid against the user should await an answer, got ${bids.map((b) => b.status).join(",")}`,
    );
  }),
);

it.effect("bids between AI clubs still resolve inside the command that placed them", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* firstAdvance(save.id);

    const rows = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        return yield* sql<{ readonly status: string }>`
          SELECT b.status FROM bids b JOIN clubs c ON c.id = b.selling_club_id
          WHERE c.is_user_club = 0`;
      }),
    );

    ok(
      rows.every((row) => row.status !== "pending"),
      "an AI seller answers immediately, so no AI-to-AI bid may be left pending",
    );
  }),
);

it.effect("a pending bid reaches the Transfers screen as an incoming bid", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* firstAdvance(save.id);

    const view = yield* getTransfersScreen(savesDir, save.id);
    ok(view.incomingBids.length > 0, "incomingBids has never been non-empty outside tests before");
    ok(view.incomingBids.every((bid) => bid.status === "pending"));
  }),
);

it.effect("records the arrival on the human club's stream", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    yield* firstAdvance(save.id);

    const events = yield* clubStreamEvents(save.id, squad.club.id);
    const received = events.filter((event) => event.tag === "BidReceived");
    const bids = yield* bidsAgainstUser(save.id);
    strictEqual(received.length, bids.length, "one event per pending bid, no more and no fewer");

    const payload = received[0]!.payload as { readonly bidId: string; readonly amount: number };
    ok(bids.some((bid) => bid.id === payload.bidId));
    ok(payload.amount > 0);
  }),
);

// ---------------------------------------------------------------------------
// Answering
// ---------------------------------------------------------------------------

it.effect("accepting an incoming bid sells the player", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* firstAdvance(save.id);

    const bid = (yield* bidsAgainstUser(save.id))[0]!;
    const before = yield* getSquad(savesDir, save.id);
    ok(before.players.some((player) => player.id === bid.playerId));

    yield* respondToBid(savesDir, save.id, bid.id as BidId, "accept", undefined);

    const after = yield* getSquad(savesDir, save.id);
    ok(
      !after.players.some((player) => player.id === bid.playerId),
      "the player should have left the squad",
    );
    strictEqual((yield* bidsAgainstUser(save.id)).find((b) => b.id === bid.id)!.status, "accepted");
  }),
);

it.effect("rejecting keeps the player and closes the bid", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* firstAdvance(save.id);

    const bid = (yield* bidsAgainstUser(save.id))[0]!;
    yield* respondToBid(savesDir, save.id, bid.id as BidId, "reject", undefined);

    const after = yield* getSquad(savesDir, save.id);
    ok(after.players.some((player) => player.id === bid.playerId));
    strictEqual((yield* bidsAgainstUser(save.id)).find((b) => b.id === bid.id)!.status, "rejected");
  }),
);

it.effect("countering hands the decision back to the AI bidder", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* firstAdvance(save.id);

    const bid = (yield* bidsAgainstUser(save.id))[0]!;
    // Within the 1.15x an AI bidder tolerates, so this is the accept side of the counter branch.
    yield* respondToBid(savesDir, save.id, bid.id as BidId, "counter", Math.round(bid.amount * 1.1));

    const settled = (yield* bidsAgainstUser(save.id)).find((b) => b.id === bid.id)!;
    ok(
      settled.status === "accepted" || settled.status === "withdrawn",
      `the AI bidder must answer a counter in the same command, got ${settled.status}`,
    );
  }),
);

it.effect("refuses a second answer to the same bid", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* firstAdvance(save.id);

    const bid = (yield* bidsAgainstUser(save.id))[0]!;
    yield* respondToBid(savesDir, save.id, bid.id as BidId, "reject", undefined);
    const exit = yield* Effect.exit(
      respondToBid(savesDir, save.id, bid.id as BidId, "accept", undefined),
    );

    ok(Exit.isFailure(exit), "an answered bid is not answerable again");
    strictEqual((yield* bidsAgainstUser(save.id)).find((b) => b.id === bid.id)!.status, "rejected");
  }),
);

// ---------------------------------------------------------------------------
// Expiry: one Continue to answer
// ---------------------------------------------------------------------------

it.effect("a bid the manager ignores expires on the next advance", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* firstAdvance(save.id);

    const pending = yield* bidsAgainstUser(save.id);
    ok(pending.length > 0);

    yield* advanceCalendar(savesDir, save.id);

    const after = yield* bidsAgainstUser(save.id);
    for (const bid of pending) {
      strictEqual(
        after.find((b) => b.id === bid.id)!.status,
        "expired",
        "an unanswered bid lapses rather than lingering",
      );
    }
  }),
);

it.effect("expiry keeps the player — lapsing is not accepting", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* firstAdvance(save.id);

    const bid = (yield* bidsAgainstUser(save.id))[0]!;
    yield* advanceCalendar(savesDir, save.id);

    const squad = yield* getSquad(savesDir, save.id);
    ok(squad.players.some((player) => player.id === bid.playerId));
  }),
);

it.effect("an answered bid is untouched by the next advance", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* firstAdvance(save.id);

    const bid = (yield* bidsAgainstUser(save.id))[0]!;
    yield* respondToBid(savesDir, save.id, bid.id as BidId, "reject", undefined);
    yield* advanceCalendar(savesDir, save.id);

    strictEqual(
      (yield* bidsAgainstUser(save.id)).find((b) => b.id === bid.id)!.status,
      "rejected",
      "expiry must only reach bids that are still pending",
    );
  }),
);

it.effect("a bid placed during an advance survives that same advance", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    // The pre-season window closes on this advance, and `runAiTransferWindow` runs inside it — so
    // the expiry step at the top of the same advance must not reach the bids it goes on to place.
    yield* firstAdvance(save.id);

    const bids = yield* bidsAgainstUser(save.id);
    ok(bids.length > 0);
    ok(bids.every((bid) => bid.status === "pending"));
  }),
);
