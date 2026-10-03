/**
 * The attribution pass: it names the players behind decided facts and records possession, drawing
 * only from its own source, so every existing seed's play is unchanged.
 */
import { describe, expect, it } from "vitest";
import { simulateMatch } from "../../src/match/simulate/index.js";
import type { MatchEvent } from "../../src/match/events.js";
import { renderCommentary } from "../../src/match/commentary.js";
import { SHIPPED } from "./shippedCommentary.js";
import { buildTeam, clubId } from "./fixtures.js";

const setup = (seed: number) => ({
  home: buildTeam(clubId("home"), seed * 2).setup,
  away: buildTeam(clubId("away"), seed * 2 + 1).setup,
});

const ATTRIBUTION_TAGS = new Set(["Tackle", "Interception", "HeaderDuel", "PossessionTally"]);

/** The timeline with everything the attribution pass added removed, and the foul victim dropped. */
const withoutAttribution = (events: ReadonlyArray<MatchEvent>): ReadonlyArray<MatchEvent> =>
  events
    .filter((event) => !ATTRIBUTION_TAGS.has(event._tag))
    .map((event) => {
      if (event._tag !== "Foul" || event.fouledPlayerId === undefined) return event;
      const rest = { ...event } as { fouledPlayerId?: unknown };
      delete rest.fouledPlayerId;
      return rest as MatchEvent;
    });

describe("attribution records decided facts without moving the seed", () => {
  it("recovers the un-attributed timeline for 200 seeds", () => {
    for (let i = 0; i < 200; i++) {
      const seed = 5000 + i;
      const home = buildTeam(clubId("home"), seed * 2).setup;
      const away = buildTeam(clubId("away"), seed * 2 + 1).setup;
      const attributed = simulateMatch({ seed, home, away });
      const plain = simulateMatch({ seed, home, away, recordAttribution: false });
      expect(withoutAttribution(attributed)).toEqual(plain);
    }
  });

  it("emits the new kinds and names a possession-side player on a foul", () => {
    for (let i = 0; i < 40; i++) {
      const seed = 7000 + i;
      const { home, away } = setup(seed);
      const events = simulateMatch({ seed, home, away });
      const squads = new Map([
        [home.clubId, new Set(home.squad.map((p) => p.id))],
        [away.clubId, new Set(away.squad.map((p) => p.id))],
      ]);
      for (const event of events) {
        if (event._tag === "Tackle" || event._tag === "Interception") {
          expect(squads.get(event.teamClubId)?.has(event.playerId)).toBe(true);
        }
        if (event._tag === "HeaderDuel") {
          expect(event.winnerId).not.toBe(event.loserId);
          expect(squads.get(event.teamClubId)?.has(event.winnerId)).toBe(true);
          const other = event.teamClubId === home.clubId ? away.clubId : home.clubId;
          expect(squads.get(other)?.has(event.loserId)).toBe(true);
        }
        if (event._tag === "Foul" && event.fouledPlayerId !== undefined) {
          const other = event.teamClubId === home.clubId ? away.clubId : home.clubId;
          expect(squads.get(other)?.has(event.fouledPlayerId)).toBe(true);
        }
      }
      expect(events.some((e) => e._tag === "PossessionTally")).toBe(true);
    }
  });

  it("counts every minute-slice in the final tally", () => {
    for (const seed of [11, 22, 33]) {
      const { home, away } = setup(seed);
      const events = simulateMatch({ seed, home, away });
      const tallies = events.filter((e) => e._tag === "PossessionTally");
      const last = tallies.at(-1);
      expect(last?.homeSlices).toBeGreaterThan(0);
      expect(last?.awaySlices).toBeGreaterThan(0);
      // 45 minutes + one stoppage slice per half.
      expect(last!.homeSlices + last!.awaySlices).toBe(92);
      for (let i = 1; i < tallies.length; i++) {
        const previous = tallies[i - 1]!;
        const current = tallies[i]!;
        expect(current.homeSlices + current.awaySlices).toBeGreaterThan(previous.homeSlices + previous.awaySlices);
        expect(current.homeSlices).toBeGreaterThanOrEqual(previous.homeSlices);
        expect(current.awaySlices).toBeGreaterThanOrEqual(previous.awaySlices);
      }
    }
  });

  it("lands tackles won, interceptions and fouls in the researched ranges", () => {
    const N = 200;
    let tackles = 0, interceptions = 0, fouls = 0, headers = 0;
    for (let i = 0; i < N; i++) {
      const seed = 1000 + i;
      const { home, away } = setup(seed);
      for (const event of simulateMatch({ seed, home, away })) {
        if (event._tag === "Tackle") tackles++;
        else if (event._tag === "Interception") interceptions++;
        else if (event._tag === "Foul") fouls++;
        else if (event._tag === "HeaderDuel") headers++;
      }
    }
    // Per team per match; Opta 2024/25 (see docs/research/match-engine-calibration-figures.md).
    expect(tackles / N / 2).toBeGreaterThanOrEqual(10);
    expect(tackles / N / 2).toBeLessThanOrEqual(13);
    expect(interceptions / N / 2).toBeGreaterThanOrEqual(8);
    expect(interceptions / N / 2).toBeLessThanOrEqual(12);
    expect(fouls / N).toBeGreaterThan(0);
    // Headers are bounded by this engine's own cross and corner volume, not the real-football range.
    expect(headers / N).toBeGreaterThan(0);
    expect(headers / N).toBeLessThan(40);
  });

  it("stays inside the event-volume and timeline-size budget", () => {
    const N = 200;
    let events = 0, bytes = 0;
    for (let i = 0; i < N; i++) {
      const seed = 2000 + i;
      const { home, away } = setup(seed);
      const timeline = simulateMatch({ seed, home, away });
      events += timeline.length;
      bytes += JSON.stringify(timeline).length;
    }
    expect(events / N).toBeLessThanOrEqual(180);
    expect(bytes / N / 1024).toBeLessThanOrEqual(20);
  });

  it("keeps one commentary line per event, silent where the engine only records a figure", () => {
    const seed = 9001;
    const { home, away } = setup(seed);
    const events = simulateMatch({ seed, home, away });
    const names = { clubName: (id: string) => id, playerName: (id: string) => id };
    const lines = renderCommentary(events, seed, names, SHIPPED);
    expect(lines).toHaveLength(events.length);
    for (const line of lines) {
      if (!["Tackle", "Interception", "HeaderDuel", "PossessionTally"].includes(line.tag)) continue;
      expect(line.silent).toBe(true);
      expect(line.text).toBe("");
      expect(line.parts).toEqual([]);
    }
    expect(lines.some((line) => line.silent)).toBe(true);
  });
});
