import { Tactic } from "@cm-clone/contracts";
import {
  FORMATIONS,
  FORMATION_SLOTS,
  POSITIONS,
  POSITION_ROLES,
  transferValue,
  weeklyWage,
  type Formation,
  type Position,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadSquadPlayers } from "./squad.js";
import { persistTactic, validateTactic } from "./tactics.js";
import { aiPlaceBid, aiSignFreeAgent, loadAllPlayersEcon, loadClubBudgetRow, loadWageBudgetUsed } from "./transfers.js";

// ---------------------------------------------------------------------------
// AI Tactic assignment (ticket 17 / ADR-0005): one fixed Tactic per AI club, chosen once at
// Season start by best-fit against the squad's own Position Ratings, never touched again.
// ---------------------------------------------------------------------------

interface SquadPlayerLike {
  readonly id: string;
  readonly positionRatings: Record<string, number>;
}

/**
 * Greedy best-XI assignment for one Formation: fills each slot (GK + 10 outfield, in the
 * Formation's fixed slot order) with the best-rated available squad player at that slot's
 * Position, without reuse. Ties on rating broken by player id (ascending) — deterministic, no
 * unseeded randomness (ticket 17's reproducibility requirement). Returns the filled slots and the
 * summed Position Rating across the 10 *outfield* slots only (GK excluded, per ticket 17's
 * "summed best-XI Position Rating across the 10 outfield slots") — the Formation-comparison
 * metric, not used to fill the GK slot itself.
 */
const bestXiForFormation = (formation: Formation, squad: ReadonlyArray<SquadPlayerLike>) => {
  const used = new Set<string>();
  const positions = FORMATION_SLOTS[formation];
  const filled = positions.map((position) => {
    const candidates = squad
      .filter((player) => !used.has(player.id))
      .sort(
        (a, b) =>
          (b.positionRatings[position] ?? 0) - (a.positionRatings[position] ?? 0) || a.id.localeCompare(b.id),
      );
    const chosen = candidates[0];
    if (!chosen) {
      throw new Error(`squad has fewer players than ${formation} needs (${positions.length})`);
    }
    used.add(chosen.id);
    return { position, playerId: chosen.id, rating: chosen.positionRatings[position] ?? 0 };
  });
  const outfieldSum = filled.reduce(
    (sum, slot, index) => (positions[index] === "GK" ? sum : sum + slot.rating),
    0,
  );
  return { filled, outfieldSum };
};

/**
 * Best-fit Tactic for one club's squad (ticket 17 / ADR-0005's AI-club tactics): the Formation
 * (among the 5 v1 Formations) maximizing summed best-XI Position Rating across its 10 outfield
 * slots, filled greedily; roles defaulted to each slot's v1 Role (`POSITION_ROLES`); instructions
 * fixed at balanced/normal/medium. Formation ties broken by `FORMATIONS`' declared order (first
 * strictly-greater sum wins, so an earlier Formation wins any tie) — deterministic, documented per
 * ticket 17. Pure; exported for direct unit testing.
 */
export const pickBestFormationTactic = (squad: ReadonlyArray<SquadPlayerLike>): Tactic => {
  let best: { formation: Formation; filled: ReturnType<typeof bestXiForFormation>["filled"]; outfieldSum: number } | null =
    null;
  for (const formation of FORMATIONS) {
    const { filled, outfieldSum } = bestXiForFormation(formation, squad);
    if (!best || outfieldSum > best.outfieldSum) {
      best = { formation, filled, outfieldSum };
    }
  }
  const chosen = best!;
  return new Tactic({
    formation: chosen.formation,
    slots: chosen.filled.map((slot) => ({
      position: slot.position,
      role: POSITION_ROLES[slot.position],
      playerId: slot.playerId,
    })),
    mentality: "balanced",
    tempo: "normal",
    pressing: "medium",
  });
};

/**
 * Season-start AI Tactic assignment (ticket 17): every non-user club gets one fixed Tactic for
 * the whole Season, persisted the same way `changeTactics` persists the user's — direct in-process
 * writes via `tactics.ts`'s `persistTactic`, never through the RpcGroup. Called once from
 * `startSeason`; nothing else ever recomputes or rewrites an AI club's Tactic afterward, so "never
 * changes mid-season" holds by construction rather than needing an explicit guard. Clubs
 * processed in id order for determinism (ticket 17), though tactic assignment is per-club
 * independent so order has no effect on the outcome — kept for consistency with the transfer-
 * window orchestration below, where order does matter.
 */
export const assignAiTactics = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const clubs = yield* sql<{
    id: string;
    isUserClub: number;
  }>`SELECT id, is_user_club as "isUserClub" FROM clubs ORDER BY id`;

  for (const club of clubs) {
    if (club.isUserClub === 1) continue;
    const squad = yield* loadSquadPlayers(club.id);
    const tactic = pickBestFormationTactic(squad);
    yield* validateTactic(tactic, new Set(squad.map((player) => player.id)));
    yield* persistTactic(club.id, tactic);
  }
});

// ---------------------------------------------------------------------------
// AI transfer-window activity (ticket 17 / ADR-0005): squad-gap detection against the league
// average, then buying/signing to fix it, self-issued in-process.
// ---------------------------------------------------------------------------

/** How far below the league average a club's best Position Rating at a slot must fall before it's
 * treated as a squad gap worth fixing (ticket 17 design judgment call — neither the ticket nor
 * ADR-0005 pins a number). 90% keeps AI buying reserved for genuinely weak slots rather than
 * firing on every slot that's merely a little below average; cited here since it's this ticket's
 * call, not a formula derived elsewhere. */
const WEAK_POSITION_THRESHOLD = 0.9;

const bestRatingAtPosition = (
  squad: ReadonlyArray<{ readonly positionRatings: Record<string, number> }>,
  position: Position,
): number => (squad.length === 0 ? 0 : Math.max(...squad.map((player) => player.positionRatings[position] ?? 0)));

/**
 * League-average best Position Rating per slot, across every club's squad (ticket 17: "a per-
 * Position league average across all clubs' squads"). `squadsByClub` is one squad per club in the
 * league (every club, not just AI ones — the user's squad counts toward the average too), in any
 * order. Pure; exported for direct unit testing.
 */
export const computeLeagueAveragePositionRatings = (
  squadsByClub: ReadonlyArray<ReadonlyArray<{ readonly positionRatings: Record<string, number> }>>,
): Record<Position, number> => {
  const result = {} as Record<Position, number>;
  for (const position of POSITIONS) {
    const bestPerClub = squadsByClub.map((squad) => bestRatingAtPosition(squad, position));
    result[position] = bestPerClub.length === 0 ? 0 : bestPerClub.reduce((sum, r) => sum + r, 0) / bestPerClub.length;
  }
  return result;
};

/** Positions where `squad`'s own best Position Rating falls below `WEAK_POSITION_THRESHOLD` of
 * the league average for that slot (ticket 17). Pure; exported for direct unit testing. */
export const identifyWeakPositions = (
  squad: ReadonlyArray<{ readonly positionRatings: Record<string, number> }>,
  leagueAverages: Record<Position, number>,
): ReadonlyArray<Position> =>
  POSITIONS.filter((position) => bestRatingAtPosition(squad, position) < leagueAverages[position] * WEAK_POSITION_THRESHOLD);

/**
 * AI-club transfer activity at one Transfer Window's open (ticket 17 / ADR-0005): for every AI
 * club, in club-id order (deterministic outcomes given the same starting state — ticket 17), find
 * weak Positions against the league average and, for each one, bid Transfer Value exactly on the
 * highest-Transfer-Value affordable Natural/Competent player at that Position — a Free Agent is
 * signed directly instead of bid on, since Free Agent signing has no Bid step (ADR-0005). Budget
 * and wage headroom are re-read fresh before every bid, so an earlier bid this same window (by
 * this club or an earlier one) is already reflected. One target per weak Position per window; if
 * two AI clubs would target the same player this window, the first (by club-id processing order)
 * gets it and the later club simply skips that player this window — this ticket's documented
 * simplification for concurrent-target conflicts, not a real negotiation. Self-issued in-process —
 * never through the RpcGroup.
 */
export const runAiTransferWindow = (seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const clubRows = yield* sql<{
      id: string;
      isUserClub: number;
    }>`SELECT id, is_user_club as "isUserClub" FROM clubs ORDER BY id`;

    const squadsByClub = new Map<string, ReadonlyArray<{ readonly id: string; readonly positionRatings: Record<string, number> }>>();
    for (const club of clubRows) {
      squadsByClub.set(club.id, yield* loadSquadPlayers(club.id));
    }
    const leagueAverages = computeLeagueAveragePositionRatings([...squadsByClub.values()]);

    const allPlayers = yield* loadAllPlayersEcon;
    // Players already targeted by an earlier AI club this window — a later club skips them
    // (ticket 17's documented same-window-conflict simplification, see doc comment above).
    const targetedThisWindow = new Set<string>();

    for (const club of clubRows) {
      if (club.isUserClub === 1) continue;
      const mySquad = squadsByClub.get(club.id)!;
      const weakPositions = identifyWeakPositions(mySquad, leagueAverages);

      for (const position of weakPositions) {
        const budget = yield* loadClubBudgetRow(club.id);
        const wageUsed = yield* loadWageBudgetUsed(club.id);

        const candidates = allPlayers.filter(
          (player) =>
            player.clubId !== club.id &&
            !targetedThisWindow.has(player.id) &&
            player.positions.some(
              (p) => p.position === position && (p.familiarity === "natural" || p.familiarity === "competent"),
            ),
        );

        const affordable = candidates
          .map((player) => ({
            player,
            value: transferValue(player.overallRating, player.age, player.potentialAbility),
            wage: weeklyWage(player.overallRating, player.age, player.potentialAbility),
          }))
          .filter(({ value, wage }) => value <= budget.transferBudgetRemaining && wageUsed + wage <= budget.wageBudget)
          // Highest Transfer Value first; ties broken by player id — deterministic, no unseeded
          // randomness (ticket 17).
          .sort((a, b) => b.value - a.value || a.player.id.localeCompare(b.player.id));

        const target = affordable[0];
        if (!target) continue;

        targetedThisWindow.add(target.player.id);
        if (target.player.clubId === null) {
          yield* aiSignFreeAgent(club.id, target.player.id, seasonNumber);
        } else {
          yield* aiPlaceBid(club.id, target.player.id, target.value, seasonNumber);
        }
      }
    }
  });
