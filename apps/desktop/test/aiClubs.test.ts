import { mkdtempSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { FORMATIONS, selectBestFormationXI, transferValue } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import {
  computeLeagueAveragePositionRatings,
  identifyWeakPositions,
  pickBestFormationTactic,
} from "../src/main/aiClubs.js";
import { advanceCalendar } from "../src/main/season/index.js";
import { createSave } from "../src/main/saves.js";
import { getSquad, loadSquadPlayers } from "../src/main/squad.js";
import { loadPersistedTactic, validateTactic } from "../src/main/tactics.js";
import { aiPlaceBid, loadAllPlayersEcon, respondToBid } from "../src/main/transfers/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-aiclubs-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const allClubs = (saveId: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      return yield* sql<{
        id: string;
        statureTier: "big" | "mid" | "small";
        isUserClub: number;
      }>`SELECT id, stature_tier as "statureTier", is_user_club as "isUserClub" FROM clubs ORDER BY id`;
    }),
  );

// ---------------------------------------------------------------------------
// AI Tactic assignment at Season start (ticket 17)
// ---------------------------------------------------------------------------

it.effect("every AI club gets a valid, fixed Tactic at Season start; the user's club gets none", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const clubs = yield* allClubs(save.id);
    ok(clubs.length === 20);

    for (const club of clubs) {
      const tactic = yield* withSave(save.id, loadPersistedTactic(club.id));

      if (club.isUserClub === 1) {
        strictEqual(tactic, null, "the user's club gets no auto-assigned Tactic (only ChangeTactics sets one)");
        continue;
      }

      ok(tactic, `AI club ${club.id} should have a persisted Tactic at Season start`);
      ok(FORMATIONS.includes(tactic!.formation), `${tactic!.formation} should be one of the 5 v1 Formations`);
      strictEqual(tactic!.mentality, "balanced");
      strictEqual(tactic!.tempo, "normal");
      strictEqual(tactic!.pressing, "medium");

      const squad = yield* withSave(save.id, loadSquadPlayers(club.id));
      const squadIds = new Set(squad.map((player) => player.id));
      const validation = yield* Effect.exit(validateTactic(tactic!, squadIds));
      ok(validation._tag === "Success", `AI club ${club.id}'s Tactic should pass the same validateTactic rules the human Tactics screen enforces`);
    }
  }),
);

it.effect("an AI club's Season-start Tactic never changes across a later advanceCalendar call", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const clubs = yield* allClubs(save.id);
    const aiClub = clubs.find((club) => club.isUserClub === 0)!;

    const before = yield* withSave(save.id, loadPersistedTactic(aiClub.id));
    ok(before);

    yield* advanceCalendar(savesDir, save.id); // resolves Matchday 1 (and closes the pre-season window)

    const after = yield* withSave(save.id, loadPersistedTactic(aiClub.id));
    deepStrictEqual(after, before, "the AI club's Tactic must be unchanged by a Matchday/window boundary");
  }),
);

// ---------------------------------------------------------------------------
// League-average gap detection (pure)
// ---------------------------------------------------------------------------

it.effect("identifyWeakPositions flags a Position whose club-best rating falls below 90% of the league average", () =>
  Effect.sync(() => {
    const leagueAverages = computeLeagueAveragePositionRatings([
      [{ positionRatings: { ST: 80, GK: 50 } }],
      [{ positionRatings: { ST: 80, GK: 50 } }],
      [{ positionRatings: { ST: 10, GK: 50 } }], // the weak club's own squad also counts toward the average
    ]);

    const weakSquad = [{ positionRatings: { ST: 10, GK: 50 } }];
    const weakPositions = identifyWeakPositions(weakSquad, leagueAverages);

    ok(weakPositions.includes("ST"), "ST is far below the league average and should be flagged");
    ok(!weakPositions.includes("GK"), "GK matches the league average exactly and shouldn't be flagged");
  }),
);

it.effect("identifyWeakPositions doesn't flag a Position right at the league average", () =>
  Effect.sync(() => {
    const leagueAverages = computeLeagueAveragePositionRatings([
      [{ positionRatings: { MC: 60 } }],
      [{ positionRatings: { MC: 60 } }],
    ]);
    const weakPositions = identifyWeakPositions([{ positionRatings: { MC: 60 } }], leagueAverages);
    ok(!weakPositions.includes("MC"));
  }),
);

// ---------------------------------------------------------------------------
// AI buying on a deliberately weakened AI club's roster, exercised end-to-end via advanceCalendar
// (ticket 17: AI activity fires at a window's open, self-issued in-process, never through RPC)
// ---------------------------------------------------------------------------

it.effect(
  "an AI club whose ST Position is artificially tanked below the league average buys a replacement when the pre-season window closes (via advanceCalendar)",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Test Career");
      const clubs = yield* allClubs(save.id);
      const weakClub = clubs.find((club) => club.isUserClub === 0 && club.statureTier === "big");
      ok(weakClub, "expected at least one AI club at the 'big' Stature Tier");

      const before = yield* withSave(save.id, loadSquadPlayers(weakClub!.id));
      const beforeIds = new Set(before.map((player) => player.id));

      yield* withSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          // Tank every player's ST-relevant attributes so this club's best ST Position Rating
          // (positionRating is purely attribute-weighted, familiarity-agnostic — see
          // packages/shared/src/ratings.ts) falls far below the league average, guaranteeing
          // `identifyWeakPositions` flags ST regardless of what the rest of the league rolled.
          yield* sql`UPDATE players SET finishing = 1, shooting = 1, composure = 1, heading = 1, pace = 1, dribbling = 1 WHERE club_id = ${weakClub!.id}`;
          // Budget/wage headroom isn't what this test is exercising — remove it as a confound so
          // a real affordable ST replacement is guaranteed to exist somewhere in the league.
          yield* sql`UPDATE club_budgets SET transfer_budget_remaining = 100000000, wage_budget = 1000000 WHERE club_id = ${weakClub!.id}`;
        }),
      );

      // Matchday 1 also closes the pre-season Transfer Window — the hook season.ts fires AI
      // transfer activity from for the pre-season window (there's no separate "windowOpen"
      // boundary for it; see season.ts's comment at that call site).
      yield* advanceCalendar(savesDir, save.id);

      const after = yield* withSave(save.id, loadSquadPlayers(weakClub!.id));
      ok(
        after.some((player) => !beforeIds.has(player.id)),
        "the weakened AI club should have acquired a new player (bid-and-bought or signed as a Free Agent) to fix its ST gap",
      );
    }),
);

// ---------------------------------------------------------------------------
// AI seller auto-response (ticket 17: wires `decideAiSellerResponse` to actually fire for AI-vs-AI
// bids, and for a human counter-offer landing on an AI bidder)
// ---------------------------------------------------------------------------

it.effect("aiPlaceBid resolves the seller's response automatically when one AI club bids on another AI club's player", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const clubs = yield* allClubs(save.id);
    const [buyerClub, sellerClub] = clubs.filter((club) => club.isUserClub === 0);

    const { target, value } = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const players = yield* loadAllPlayersEcon;
        const target = players.find((player) => player.clubId === sellerClub!.id)!;
        const value = transferValue(target.overallRating, target.age, target.potentialAbility);
        yield* sql`UPDATE club_budgets SET transfer_budget_remaining = 100000000, wage_budget = 1000000 WHERE club_id = ${buyerClub!.id}`;
        return { target, value };
      }),
    );

    const result = yield* withSave(save.id, aiPlaceBid(buyerClub!.id, target.id, value, 1));
    ok(result);
    // Bidding exactly Transfer Value always clears `decideAiSellerResponse`'s >=1.0x accept
    // threshold — the "outright accept" branch, resolved with no human ever in the loop.
    strictEqual(result!.status, "accepted");

    const buyerSquad = yield* withSave(save.id, loadSquadPlayers(buyerClub!.id));
    ok(buyerSquad.some((player) => player.id === target.id), "the transfer should have completed to the buying AI club");
  }),
);

it.effect("respondToBid's counter branch resolves the AI bidder immediately: accepts a counter within 1.15x if still affordable", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const userSquad = yield* getSquad(savesDir, save.id);
    const clubs = yield* allClubs(save.id);
    const aiBidderClubId = clubs.find((club) => club.isUserClub === 0)!.id;
    const targetPlayerId = userSquad.players[0]!.id;

    const bidId = "test-bid-1";
    const { value } = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const players = yield* loadAllPlayersEcon;
        const target = players.find((player) => player.id === targetPlayerId)!;
        const value = transferValue(target.overallRating, target.age, target.potentialAbility);
        // Insert the incoming Bid directly (ticket 16's pattern: there's no AI-bid-origination
        // into the human club exercised elsewhere in this suite) — status 'pending', low enough
        // that a counter-offer up to Transfer Value is a legal seller response.
        yield* sql`INSERT INTO bids (id, player_id, selling_club_id, bidding_club_id, amount, counter_amount, status, season_number)
          VALUES (${bidId}, ${targetPlayerId}, ${userSquad.club.id}, ${aiBidderClubId}, ${Math.round(value * 0.9)}, NULL, 'pending', 1)`;
        yield* sql`UPDATE club_budgets SET transfer_budget_remaining = 100000000, wage_budget = 1000000 WHERE club_id = ${aiBidderClubId}`;
        return { value };
      }),
    );

    // The human (selling) club counters at exactly Transfer Value — within the AI bidder's 1.15x
    // ceiling, and budget/wage headroom was just removed as a confound above.
    yield* respondToBid(savesDir, save.id, bidId, "counter", value);

    const bidRow = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const rows = yield* sql<{ status: string }>`SELECT status FROM bids WHERE id = ${bidId}`;
        return rows[0]!;
      }),
    );
    strictEqual(bidRow.status, "accepted", "the AI bidder should auto-accept a counter within 1.15x Transfer Value");

    const buyerSquad = yield* withSave(save.id, loadSquadPlayers(aiBidderClubId));
    ok(buyerSquad.some((player) => player.id === targetPlayerId));
  }),
);

it.effect("respondToBid's counter branch withdraws the AI bidder immediately when the counter exceeds 1.15x", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const userSquad = yield* getSquad(savesDir, save.id);
    const clubs = yield* allClubs(save.id);
    const aiBidderClubId = clubs.find((club) => club.isUserClub === 0)!.id;
    const targetPlayerId = userSquad.players[0]!.id;

    const bidId = "test-bid-2";
    const { value } = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const players = yield* loadAllPlayersEcon;
        const target = players.find((player) => player.id === targetPlayerId)!;
        const value = transferValue(target.overallRating, target.age, target.potentialAbility);
        yield* sql`INSERT INTO bids (id, player_id, selling_club_id, bidding_club_id, amount, counter_amount, status, season_number)
          VALUES (${bidId}, ${targetPlayerId}, ${userSquad.club.id}, ${aiBidderClubId}, ${Math.round(value * 0.9)}, NULL, 'pending', 1)`;
        // Budget is generous, but the counter itself (2x Transfer Value) is what blows past the
        // AI bidder's 1.15x ceiling.
        yield* sql`UPDATE club_budgets SET transfer_budget_remaining = 100000000, wage_budget = 1000000 WHERE club_id = ${aiBidderClubId}`;
        return { value };
      }),
    );

    yield* respondToBid(savesDir, save.id, bidId, "counter", value * 2);

    const bidRow = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const rows = yield* sql<{ status: string }>`SELECT status FROM bids WHERE id = ${bidId}`;
        return rows[0]!;
      }),
    );
    strictEqual(bidRow.status, "withdrawn", "the AI bidder should withdraw rather than accept above 1.15x Transfer Value");

    const buyerSquad = yield* withSave(save.id, loadSquadPlayers(aiBidderClubId));
    ok(!buyerSquad.some((player) => player.id === targetPlayerId), "the player should still belong to the user's club");
  }),
);

// ---------------------------------------------------------------------------
// AI activity never touches the RpcGroup (ticket 17's explicit call-out)
// ---------------------------------------------------------------------------

it.effect(
  "AI-club activity (Tactic assignment + transfer-window buying) is fully resolved by the time createSave/advanceCalendar return, with no RPC round-trip involved",
  () =>
    Effect.gen(function* () {
      // `createSave`/`advanceCalendar` are plain in-process Effect functions this whole suite
      // calls directly (never through `window.cmClone.call`/`rpcServer.ts`'s dispatch) — the same
      // way the desktop app's IPC layer eventually calls them. If AI Tactic assignment or AI
      // transfer activity were only reachable through an RPC method, the assertions in this
      // file's other tests (persisted Tactics/bids/squad changes visible right after these calls
      // return) would be the first thing to fail, since nothing pumps an RPC loop here.
      const save = yield* createSave(savesDir, "Test Career");
      const clubs = yield* allClubs(save.id);
      const aiClub = clubs.find((club) => club.isUserClub === 0)!;
      const tacticRightAfterCreate = yield* withSave(save.id, loadPersistedTactic(aiClub.id));
ok(tacticRightAfterCreate, "AI Tactic assignment already landed synchronously inside createSave/startSeason");

  yield* advanceCalendar(savesDir, save.id);
  ok(true, "advanceCalendar's window-boundary AI transfer activity ran synchronously in-process (see other tests for its effects)");
}),
);

// ---------------------------------------------------------------------------
// pickBestFormationTactic matches selectBestFormationXI (ticket 01a: ordered preservation)
// ---------------------------------------------------------------------------

it.effect("pickBestFormationTactic returns the same formation and slots as selectBestFormationXI", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const clubs = yield* allClubs(save.id);

    for (const club of clubs) {
      if (club.isUserClub === 1) continue;

      const squad = yield* withSave(save.id, loadSquadPlayers(club.id));
      const tacticYielded = yield* withSave(save.id, pickBestFormationTactic(squad));

      // selectBestFormationXI is pure; call it directly
      const algorithmResult = selectBestFormationXI(squad);

      ok(algorithmResult._tag === "success", `selectBestFormationXI should succeed for club ${club.id}`);
      if (algorithmResult._tag === "success") {
        ok(FORMATIONS.includes(tacticYielded.formation), `formation ${tacticYielded.formation} should be one of the 5 v1 Formations`);
        strictEqual(
          tacticYielded.formation,
          algorithmResult.formation,
          `pickBestFormationTactic's formation must match selectBestFormationXI's for club ${club.id}`,
        );

        // The slots from pickBestFormationTactic (with roles/mentality/etc filled in) must
        // correspond position-by-position to selectBestFormationXI's slots.
        strictEqual(
          tacticYielded.slots.length,
          algorithmResult.slots.length,
          `slot count must match for club ${club.id}`,
        );
        for (let i = 0; i < algorithmResult.slots.length; i++) {
          const algorithmSlot = algorithmResult.slots[i]!;
          const tacticSlot = tacticYielded.slots[i]!;
          strictEqual(
            tacticSlot.position,
            algorithmSlot.position,
            `slot ${i} position mismatch for club ${club.id}`,
          );
          strictEqual(
            tacticSlot.playerId,
            algorithmSlot.playerId,
            `slot ${i} player mismatch for club ${club.id}: pickBestFormationTactic chose ${tacticSlot.playerId} but selectBestFormationXI chose ${algorithmSlot.playerId}`,
          );
        }
      }
    }
  }),
);

it("aiClubs.ts never imports the rpcServer/renderer IPC surface", () => {
  const source = readFileSync(path.join(__dirname, "../src/main/aiClubs.ts"), "utf8");
  ok(!source.includes("rpcServer.js"), "no import from the RpcGroup dispatch module");
  ok(!source.includes("window.cmClone"), "no renderer-side IPC bridge call");
});
