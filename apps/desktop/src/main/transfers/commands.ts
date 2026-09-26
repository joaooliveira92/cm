import { randomUUID } from "node:crypto";
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  BidNotFoundError,
  BidView,
  ContractRenewalNotDueError,
  InsufficientTransferBudgetError,
  InvalidBidActionError,
  InvalidContractOfferTermsError,
  PlayerNotFoundError,
  PlayerNotFreeAgentError,
  TransferWindowClosedError,
  TransfersScreenView,
  WageBudgetExceededError,
  BidId,
  type ClubSummary,
  type PlayerId,
  type Role,
  type SaveId,
} from "@cm-clone/contracts";
import {
  DEFAULT_CONTRACT_YEARS,
  MAX_CONTRACT_YEARS,
  MIN_CONTRACT_YEARS,
  POSITION_ROLES,
  progressForReading,
  transferValue,
  wageFigureByProgress,
  wageIsWithinFigure,
  weeklyWage,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { assertSaveNotArchived } from "../career/managerStatus.js";
import { loadUserClub } from "../club/squad.js";
import {
  loadClubScoutingProgress,
  loadProgressOnPlayer,
} from "../club/scoutingProgress.js";
import { isWindowOpen, loadSeasonRow, toSeasonView } from "../season/currentSeason.js";
import { decideAiSellerResponse, resolveAiCounterOffer } from "./ai.js";
import {
  appendHumanClubEvents,
  completeTransfer,
  loadBidRow,
  loadBidsForClub,
  playerSignedEvent,
  recordTransfer,
} from "./bids.js";
import { loadClubBudgetRow, loadWageBudgetUsed } from "./budgets.js";
import { loadAllPlayersEcon, loadPlayerEcon, toMarketPlayerView } from "./economics.js";

// ---------------------------------------------------------------------------
// Read side: the Transfer market/inbox screen
// ---------------------------------------------------------------------------

const buildTransfersScreenView = (club: ClubSummary) =>
  Effect.gen(function* () {
    const seasonRow = yield* loadSeasonRow;
    const budget = yield* loadClubBudgetRow(club.id);
    const wageBudgetUsed = yield* loadWageBudgetUsed(club.id);
    const { incoming, outgoing } = yield* loadBidsForClub(club.id);
    const players = yield* loadAllPlayersEcon(seasonRow.currentDate);
    const progressByPlayer = yield* loadClubScoutingProgress(club.id);

    const toView = (player: (typeof players)[number]) => {
      const progress = progressByPlayer.get(player.id) ?? 0;
      return toMarketPlayerView(player, progress);
    };

    // Both lists read by this club's progress on each player — an unscouted Free Agent or rival
    // reads at progress 0 (the widest honest Range), a scouted one narrows, a Fully Scouted one is
    // exact. Progress is part of the read, never of what is stored (ticket 09).
    const freeAgents = players.filter((player) => player.clubId === null).map(toView);
    const marketPlayers = players
      .filter((player) => player.clubId !== null && player.clubId !== club.id)
      .map(toView);

    return new TransfersScreenView({
      club,
      season: yield* toSeasonView(seasonRow),
      windowOpen: isWindowOpen(seasonRow.phase),
      transferBudgetRemaining: budget.transferBudgetRemaining,
      wageBudget: budget.wageBudget,
      wageBudgetUsed,
      incomingBids: incoming,
      outgoingBids: outgoing,
      freeAgents,
      marketPlayers,
    });
  });

export const getTransfersScreen = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const club = yield* loadUserClub;
      return yield* buildTransfersScreenView(club);
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

// ---------------------------------------------------------------------------
// Commands: Bid / respond / sign / renew — all scoped to the user's own club, the only
// human-controlled club this ticket's RPC surface exposes (ticket 16).
// ---------------------------------------------------------------------------

const clampYears = (years: number | undefined): number =>
  Math.min(MAX_CONTRACT_YEARS, Math.max(MIN_CONTRACT_YEARS, years ?? DEFAULT_CONTRACT_YEARS));

/** Any player is biddable regardless of a Listed flag (ticket 05: not modeled at all — no gate to
 * bypass). A Bid is legal only during an open Transfer Window. The selling club (always an
 * AI-controlled club in this build) responds instantly via `decideAiSellerResponse`, since there's
 * no human on the other side to await — the resulting Bid can come back `accepted` (the transfer
 * completes immediately), `countered` (the user then calls `respondAsBidder`), or `rejected`. */
export const placeBid = (savesDir: string, saveId: SaveId, playerId: PlayerId, amount: number) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      yield* assertSaveNotArchived(saveId);
      const sql = yield* SqlClient;
      const club = yield* loadUserClub;
      const seasonRow = yield* loadSeasonRow;
      if (!isWindowOpen(seasonRow.phase)) {
        return yield* new TransferWindowClosedError({ saveId });
      }

      const player = yield* loadPlayerEcon(playerId, seasonRow.currentDate);
      if (!player) {
        return yield* new PlayerNotFoundError({ playerId });
      }
      if (player.clubId === club.id) {
        return yield* new InvalidBidActionError({ reason: "cannot bid for a player already at your own club" });
      }
      if (player.clubId === null) {
        return yield* new InvalidBidActionError({
          reason: "player is a Free Agent — sign them directly, no Bid step needed",
        });
      }

      const budget = yield* loadClubBudgetRow(club.id);
      if (amount > budget.transferBudgetRemaining) {
        return yield* new InsufficientTransferBudgetError({
          clubId: club.id,
          amount,
          remaining: budget.transferBudgetRemaining,
        });
      }

      const id = BidId.make(randomUUID());
      const value = transferValue(player.overallRating, player.age, player.potentialAbility);
      const decision = decideAiSellerResponse(amount, value);

      if (decision.action === "accept") {
        yield* completeTransfer({
          playerId,
          sellingClubId: player.clubId,
          biddingClubId: club.id,
          amount,
          seasonNumber: seasonRow.seasonNumber,
          gameDate: seasonRow.currentDate,
        });
      }

      yield* sql`INSERT INTO bids (id, player_id, selling_club_id, bidding_club_id, amount, counter_amount, status, season_number)
        VALUES (${id}, ${playerId}, ${player.clubId}, ${club.id}, ${amount}, ${decision.counterAmount},
          ${decision.action === "accept" ? "accepted" : decision.action === "counter" ? "countered" : "rejected"},
          ${seasonRow.seasonNumber})`;

      return new BidView({
        id,
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        sellingClubId: player.clubId,
        sellingClubName: player.clubName ?? "",
        biddingClubId: club.id,
        biddingClubName: club.name,
        amount,
        counterAmount: decision.counterAmount,
        status: decision.action === "accept" ? "accepted" : decision.action === "counter" ? "countered" : "rejected",
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

/** The selling club's side of the single-counter-offer Bid flow: accept (completes the transfer
 * at `bid.amount`), reject, or make exactly one counter-offer (ticket 05/16). */
export const respondToBid = (
  savesDir: string,
  saveId: SaveId,
  bidId: BidId,
  action: "accept" | "reject" | "counter",
  counterAmount: number | undefined,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      yield* assertSaveNotArchived(saveId);
      const sql = yield* SqlClient;
      const club = yield* loadUserClub;
      const seasonRow = yield* loadSeasonRow;
      const bid = yield* loadBidRow(bidId);
      if (!bid) {
        return yield* new BidNotFoundError({ bidId });
      }
      if (bid.sellingClubId !== club.id) {
        return yield* new InvalidBidActionError({ reason: "this Bid isn't for one of your players" });
      }
      if (bid.status !== "pending") {
        return yield* new InvalidBidActionError({ reason: `Bid is ${bid.status}, not awaiting a seller response` });
      }
      // No transfer-window gate here by design: answering a bid that the market already placed in a
      // window merely resolves a negotiation that is in flight, it does not open a new one. An
      // unanswered incoming bid lapses at the next Continue (`expireStalePendingBids`), so the only
      // thing gating a response is whether the bid is still `pending` — checked above.

      if (action === "reject") {
        yield* sql`UPDATE bids SET status = 'rejected' WHERE id = ${bidId}`;
      } else if (action === "counter") {
        if (counterAmount === undefined || counterAmount <= 0) {
          return yield* new InvalidBidActionError({ reason: "a counter-offer needs a positive counterAmount" });
        }
        yield* sql`UPDATE bids SET status = 'countered', counter_amount = ${counterAmount} WHERE id = ${bidId}`;
        // The bidder here is always an AI club (only the user's own club can call `respondToBid`,
        // and there's exactly one human-controlled club in this build — `bid.sellingClubId ===
        // club.id` above already proves it) — resolve its reaction to the counter immediately via
        // the same 1.15x-or-withdraw threshold `aiClubs.ts`'s own bidding uses (ticket 17), rather
        // than leaving the Bid `countered` forever with no AI turn to act on it.
        yield* resolveAiCounterOffer(bidId, bid.biddingClubId, seasonRow.seasonNumber, seasonRow.currentDate);
      } else {
        yield* completeTransfer({
          playerId: bid.playerId,
          sellingClubId: bid.sellingClubId,
          biddingClubId: bid.biddingClubId,
          amount: bid.amount,
          seasonNumber: seasonRow.seasonNumber,
          gameDate: seasonRow.currentDate,
        });
        yield* sql`UPDATE bids SET status = 'accepted' WHERE id = ${bidId}`;
      }

      return yield* buildTransfersScreenView(club);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

/** The bidding club's side of the Bid flow after a counter-offer: accept (completes the transfer
 * at `bid.counterAmount`) or withdraw. Withdrawing is also allowed before the seller has responded
 * (`status: "pending"`). */
export const respondAsBidder = (
  savesDir: string,
  saveId: SaveId,
  bidId: BidId,
  action: "accept" | "withdraw",
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      yield* assertSaveNotArchived(saveId);
      const sql = yield* SqlClient;
      const club = yield* loadUserClub;
      const seasonRow = yield* loadSeasonRow;
      const bid = yield* loadBidRow(bidId);
      if (!bid) {
        return yield* new BidNotFoundError({ bidId });
      }
      if (bid.biddingClubId !== club.id) {
        return yield* new InvalidBidActionError({ reason: "this Bid isn't one of yours" });
      }

      if (action === "withdraw") {
        if (bid.status !== "pending" && bid.status !== "countered") {
          return yield* new InvalidBidActionError({ reason: `Bid is ${bid.status}, nothing left to withdraw` });
        }
        yield* sql`UPDATE bids SET status = 'withdrawn' WHERE id = ${bidId}`;
        return yield* buildTransfersScreenView(club);
      }

      if (bid.status !== "countered" || bid.counterAmount === null) {
        return yield* new InvalidBidActionError({ reason: "there's no counter-offer to accept on this Bid" });
      }
      if (!isWindowOpen(seasonRow.phase)) {
        return yield* new TransferWindowClosedError({ saveId });
      }

      yield* completeTransfer({
        playerId: bid.playerId,
        sellingClubId: bid.sellingClubId,
        biddingClubId: bid.biddingClubId,
        amount: bid.counterAmount,
        seasonNumber: seasonRow.seasonNumber,
        gameDate: seasonRow.currentDate,
      });
      yield* sql`UPDATE bids SET status = 'accepted' WHERE id = ${bidId}`;

      return yield* buildTransfersScreenView(club);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

/** The Contract length a manager may name: a whole number of years inside the 1-5 range
 *  (CONTEXT.md, Contract). The bounds come from `@cm-clone/shared` so the offer and a renewal can
 *  never disagree about which lengths exist — a *renewal* clamps (`clampYears`, unchanged
 *  behaviour), an *offer* rejects, because a terms form that silently rewrote the length the
 *  manager typed would be lying about what he agreed to. */
const isContractLength = (years: number): boolean =>
  Number.isInteger(years) && years >= MIN_CONTRACT_YEARS && years <= MAX_CONTRACT_YEARS;

/** The terms one Contract Offer carries: the Role it names, its length, and the weekly wage offered.
 *  `role` is `POSITION_ROLES` applied to one of the player's own Positions — a tactical choice, not a
 *  property the offer writes onto the player. */
export interface ContractOfferTerms {
  readonly role: Role;
  readonly years: number;
  readonly wage: number;
}

/** Signing a Free Agent: the Contract Offer (Screen 137) made good — the Role it named, its length
 *  and its wage, at Credits 0 and with no Bid step (ticket 05/16 — expiry produces a Free Agent,
 *  signable by any club).
 *
 *  The offered wage is bounded by the club's *knowledge* of the player, never by what the player
 *  would accept: `getContractOffer` published the wage band the Scouting Progress supports, and the
 *  offer must fall inside it. A Fully Scouted manager therefore signs at the exact formula wage, and
 *  an unscouted one names a figure from the band his own knowledge supports — the knowledge rule is
 *  the only thing that moves the wage, which is what keeps ADR-0005's formula authoritative while the
 *  terms form still takes a wage. */
export const signFreeAgent = (
  savesDir: string,
  saveId: SaveId,
  playerId: PlayerId,
  terms: ContractOfferTerms,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      yield* assertSaveNotArchived(saveId);
      const sql = yield* SqlClient;
      const club = yield* loadUserClub;
      const seasonRow = yield* loadSeasonRow;
      if (!isWindowOpen(seasonRow.phase)) {
        return yield* new TransferWindowClosedError({ saveId });
      }

      const player = yield* loadPlayerEcon(playerId, seasonRow.currentDate);
      if (!player) {
        return yield* new PlayerNotFoundError({ playerId });
      }
      if (player.clubId !== null) {
        return yield* new PlayerNotFreeAgentError({ playerId });
      }

      // The Role is a choice among the Positions the Player holds, so the command resolves it back
      // to one of them here: that is both the refusal below and the Position the `PlayerSigned`
      // event names, so the logged Role cannot be one the player does not hold.
      const offeredPosition = player.positions.find(
        (entry) => POSITION_ROLES[entry.position] === terms.role,
      );
      if (offeredPosition === undefined) {
        return yield* new InvalidContractOfferTermsError({
          playerId,
          reason: `${terms.role} is not a Role this player holds`,
        });
      }
      if (!isContractLength(terms.years)) {
        return yield* new InvalidContractOfferTermsError({
          playerId,
          reason: `a Contract runs ${MIN_CONTRACT_YEARS}-${MAX_CONTRACT_YEARS} years, not ${terms.years}`,
        });
      }

      const progress = progressForReading(
        player.clubId,
        club.id,
        yield* loadProgressOnPlayer(playerId, club.id),
      );
      const wageFigure = wageFigureByProgress(
        player.overallRating,
        player.age,
        player.potentialAbility,
        progress,
      );
      const wage = terms.wage;
      if (!wageIsWithinFigure(wage, wageFigure)) {
        return yield* new InvalidContractOfferTermsError({
          playerId,
          reason:
            wageFigure._tag === "exact"
              ? `the wage is Cr ${wageFigure.value}/week — what this player's knowledge supports exactly`
              : `the wage must be Cr ${wageFigure.low}-${wageFigure.high}/week — what this player's knowledge supports`,
        });
      }

      const budget = yield* loadClubBudgetRow(club.id);
      const wageUsed = yield* loadWageBudgetUsed(club.id);
      if (wageUsed + wage > budget.wageBudget) {
        return yield* new WageBudgetExceededError({
          clubId: club.id,
          wage,
          wageBudgetUsed: wageUsed,
          wageBudget: budget.wageBudget,
        });
      }

      const contractYears = terms.years;
      yield* sql`UPDATE players SET club_id = ${club.id} WHERE id = ${playerId}`;
      yield* recordTransfer({ playerId, fromClubId: null, toClubId: club.id, fee: 0 });
      // Replace any Contract row rather than inserting beside it, as accepting a Bid does. A
      // club-less Player normally has no row (`expireContractsForSeason` deletes it), but `players
      // .club_id = NULL` is what marks the Free Agent and a row left behind by any path that did
      // not clean up would fail the `contracts.player_id` unique index — as a raw SQLite error
      // surfacing to the manager as "unexpected response", not as a typed refusal.
      yield* sql`DELETE FROM contracts WHERE player_id = ${playerId}`;
      yield* sql`INSERT INTO contracts (player_id, wage, years_remaining, signed_season)
        VALUES (${playerId}, ${wage}, ${contractYears}, ${seasonRow.seasonNumber})`;

      yield* appendHumanClubEvents(club.id, [
        // The Position behind the Role the manager chose, so the event builder derives the same
        // Role the terms carried.
        playerSignedEvent({
          playerId,
          position: offeredPosition.position,
          wage,
          years: contractYears,
        }),
      ]);

      return yield* buildTransfersScreenView(club);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

/** Renewal reuses the signing flow against the player's current club during an open Transfer
 *  Window (ticket 05/16) — same formula wage, a fresh 1-5 year length. A Contract is renewed only
 *  in its last contracted year (`years_remaining === 1`): its terms are never renegotiated
 *  mid-term (CONTEXT.md, Contract), which is what the last-year guard below enforces. */
export const renewContract = (savesDir: string, saveId: SaveId, playerId: PlayerId, years: number | undefined) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      yield* assertSaveNotArchived(saveId);
      const sql = yield* SqlClient;
      const club = yield* loadUserClub;
      const seasonRow = yield* loadSeasonRow;
      if (!isWindowOpen(seasonRow.phase)) {
        return yield* new TransferWindowClosedError({ saveId });
      }

      const player = yield* loadPlayerEcon(playerId, seasonRow.currentDate);
      if (!player) {
        return yield* new PlayerNotFoundError({ playerId });
      }
      if (player.clubId !== club.id) {
        return yield* new InvalidBidActionError({ reason: "player is not contracted to your club" });
      }
      const yearsRemaining = yield* yearsRemainingOf(playerId);
      if (yearsRemaining === null) {
        // A player at a club always has a contract row; a missing one means the squad read this
        // player from is stale in the same way a missing player is.
        return yield* new PlayerNotFoundError({ playerId });
      }
      if (yearsRemaining > 1) {
        return yield* new ContractRenewalNotDueError({ playerId, yearsRemaining });
      }

      const wage = weeklyWage(player.overallRating, player.age, player.potentialAbility);
      const budget = yield* loadClubBudgetRow(club.id);
      const wageUsed = yield* loadWageBudgetUsed(club.id);
      const wageUsedWithoutThisPlayer = Math.max(0, wageUsed - (yield* currentWage(playerId)));
      if (wageUsedWithoutThisPlayer + wage > budget.wageBudget) {
        return yield* new WageBudgetExceededError({
          clubId: club.id,
          wage,
          wageBudgetUsed: wageUsedWithoutThisPlayer,
          wageBudget: budget.wageBudget,
        });
      }

      const contractYears = clampYears(years);
      yield* sql`UPDATE contracts SET wage = ${wage}, years_remaining = ${contractYears}, signed_season = ${seasonRow.seasonNumber} WHERE player_id = ${playerId}`;

      yield* appendHumanClubEvents(club.id, [
        { tag: "ContractRenewed", payload: { playerId, wage, years: contractYears } },
      ]);

      return yield* buildTransfersScreenView(club);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

const currentWage = (playerId: PlayerId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ wage: number }>`SELECT wage FROM contracts WHERE player_id = ${playerId}`;
    return rows[0]?.wage ?? 0;
  });

/** The Contract's remaining length, or `null` when there is no contract row — what the last-year
 *  guard reads. `1` is "the last contracted year": the season-end expiry sweep decrements every
 *  row and frees players who hit zero, so a player at `1` now will be freed unless renewed. */
const yearsRemainingOf = (playerId: PlayerId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ yearsRemaining: number }>`
      SELECT years_remaining as "yearsRemaining" FROM contracts WHERE player_id = ${playerId}`;
    return rows[0]?.yearsRemaining ?? null;
  });
