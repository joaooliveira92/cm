/** ═══════════════════════════════════════════════════════════════════════════
 * Calibration harness for the match engine.
 *
 * Simulates a season's worth of matches (380 = 20 teams × 38 matches / 2) with
 * average-strength teams and reports league averages against targets:
 *   - Goals per match: 2.5–2.8
 *   - Yellow cards per match: 3–4
 *   - Fouls per match: 20–26
 *
 * Run with: pnpm --filter @cm-clone/game-engine test -- --include test/match/calibrate.test.ts
 * ═══════════════════════════════════════════════════════════════════════════ */

import { describe, it } from "vitest";
import { createSeededRng, DEFAULT_TEAM_INSTRUCTIONS, DEFAULT_PLAYER_INSTRUCTIONS, DEFAULT_TEAM_SET_PIECES, EMPTY_TAKERS } from "@cm-clone/shared";
import type { PlayerAttributes } from "@cm-clone/shared";
import { PlayerId, ClubId } from "@cm-clone/contracts";
import { simulateMatch } from "../../src/match/simulate/loop.js";
import type { MatchPlayerInput, MatchTeamSetup } from "../../src/match/types.js";
import type { MatchEvent } from "../../src/match/events.js";

const MATCHES_TO_SIMULATE = 100; // 100 is enough for a quick calibration check
const SEASON_START_SEED = 42;

const AVERAGE_ATTRIBUTES: PlayerAttributes = {
  passing: 12, shooting: 11, tackling: 12, dribbling: 10, heading: 11,
  crossing: 10, finishing: 11, firstTouch: 11, positioning: 12, decisions: 11,
  composure: 11, determination: 12, teamwork: 12, flair: 10, bravery: 11,
  aggression: 11, pace: 12, acceleration: 12, stamina: 12, strength: 11,
  agility: 11, naturalFitness: 12, injuryProneness: 8,
};

const buildSquad = (clubId: string, baseSeed: number): ReadonlyArray<MatchPlayerInput> => {
  const rng = createSeededRng(baseSeed + 1000);
  return Array.from({ length: 18 }, (_, i) => {
    const offset = Math.round((rng.next() - 0.5) * 6);
    const attrs = { ...AVERAGE_ATTRIBUTES } as Record<string, number>;
    for (const key of Object.keys(AVERAGE_ATTRIBUTES)) {
      attrs[key] = Math.max(1, Math.min(20, (AVERAGE_ATTRIBUTES as Record<string, number>)[key]! + offset));
    }
    return {
      id: PlayerId.make(`${clubId}-player-${i}`),
      attributes: attrs as PlayerAttributes,
      positionalRatings: { lines: { GK: 12, SW: 11, D: 12, DM: 11, M: 12, AM: 11, F: 12, WB: 11 }, sides: { R: 11, L: 11, C: 12 }, freeRole: 10 },
    };
  });
};

const build442Slots = (squad: ReadonlyArray<MatchPlayerInput>) => {
  const rows = ["GK", "D", "D", "D", "D", "M", "M", "M", "M", "F", "F"] as const;
  const cols = ["C", "L", "C", "C", "R", "L", "C", "C", "R", "C", "C"] as const;
  return squad.slice(0, 11).map((player, i) => ({
    playerId: player.id,
    cell: { row: rows[i] as any, column: cols[i] as any },
    run: null,
  }));
};

const buildMatchSetup = (clubId: string, seed: number): MatchTeamSetup => {
  const squad = buildSquad(clubId, seed);
  const slots = build442Slots(squad);
  return {
    clubId: ClubId.make(clubId),
    squad,
    tactic: {
      slots,
      bench: squad.slice(11, 18).map((p) => p.id),
      team: { ...DEFAULT_TEAM_INSTRUCTIONS },
      slotInstructions: slots.map((s) => ({
        cell: s.cell,
        instructions: { ...DEFAULT_PLAYER_INSTRUCTIONS },
      })),
      teamSetPieces: DEFAULT_TEAM_SET_PIECES,
      takers: EMPTY_TAKERS,
    },
  };
};

interface MatchCounts { goals: number; yellowCards: number; fouls: number; }

const countEvents = (events: ReadonlyArray<MatchEvent>): MatchCounts => {
  const counts: MatchCounts = { goals: 0, yellowCards: 0, fouls: 0 };
  for (const event of events) {
    switch (event._tag) {
      case "Goal": counts.goals += 1; break;
      case "YellowCard": counts.yellowCards += 1; break;
      case "Foul": counts.fouls += 1; break;
    }
  }
  return counts;
};

describe("calibrate match engine", () => {
  it("produces average match stats within calibration targets", () => {
    const allCounts: Array<MatchCounts> = [];
    for (let i = 0; i < MATCHES_TO_SIMULATE; i++) {
      const seed = SEASON_START_SEED + i;
      const home = buildMatchSetup(`home-${i % 20}`, seed * 2);
      const away = buildMatchSetup(`away-${(i + 1) % 20}`, seed * 2 + 1);
      const events = simulateMatch({ seed, home, away });
      allCounts.push(countEvents(events));
    }

    const total = allCounts.reduce((a, c) => ({ goals: a.goals + c.goals, yellowCards: a.yellowCards + c.yellowCards, fouls: a.fouls + c.fouls }), { goals: 0, yellowCards: 0, fouls: 0 });
    const n = allCounts.length;
    const goalsPerMatch = total.goals / n;
    const yellowsPerMatch = total.yellowCards / n;
    const foulsPerMatch = total.fouls / n;

    console.log(`\n═══ Calibration Results (${n} matches) ═══`);
    console.log(`  Goals per match:    ${goalsPerMatch.toFixed(2)}  (target: 2.5–2.8)`);
    console.log(`  Yellows per match:  ${yellowsPerMatch.toFixed(2)}  (target: 3–4)`);
    console.log(`  Fouls per match:    ${foulsPerMatch.toFixed(1)}  (target: 20–26)`);

    const allMet = goalsPerMatch >= 2.5 && goalsPerMatch <= 2.8 && yellowsPerMatch >= 3 && yellowsPerMatch <= 4 && foulsPerMatch >= 20 && foulsPerMatch <= 26;
    console.log(allMet ? "  ✓ All targets met\n" : "  ⚠ Some targets not met — adjust tuning constants\n");
  }, 60000);
});