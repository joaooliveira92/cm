import { describe, expect, it } from "vitest";
import { COMMENTARY_SECTIONS, SHIPPED_COMMENTARY_TEXT, parseCommentaryFile, renderCommentary } from "../../src/match/commentary.js";
import type { MatchEvent } from "../../src/match/events.js";
import { simulateMatch } from "../../src/match/simulate/index.js";
import { buildTeam, clubId, playerId } from "./fixtures.js";
import { SHIPPED, SHIPPED_TEXT } from "./shippedCommentary.js";

const names = {
  clubName: (id: string) => (id === "home" ? "Rovers" : "United"),
  playerName: (id: string) => `Player ${id}`,
};

const started: MatchEvent = { _tag: "MatchStarted", seed: 1, homeClubId: clubId("home"), awayClubId: clubId("away") };
const foul: MatchEvent = { _tag: "Foul", minute: 3, half: 1, teamClubId: clubId("away"), playerId: playerId("p9"), isYellowCard: false };

/** Parses a player's file over the shipped one, as the desktop app does. */
const edited = (text: string) => parseCommentaryFile(text, SHIPPED);

describe("the shipped commentary file", () => {
  it("is what the generated module carries (run `pnpm generate:commentary` after editing events.cfg)", () => {
    expect(SHIPPED_COMMENTARY_TEXT).toBe(SHIPPED_TEXT);
  });

  it("parses clean and fills every section", () => {
    const parsed = parseCommentaryFile(SHIPPED_TEXT);
    expect(parsed.problems).toEqual([]);
    for (const key of COMMENTARY_SECTIONS.keys()) expect(parsed.table.templates[key].length, key).toBeGreaterThan(0);
  });

  it("fills every placeholder across whole simulated matches", () => {
    for (const seed of [3, 11, 42, 77, 2024]) {
      const events = simulateMatch({
        seed,
        home: buildTeam(clubId("home"), seed).setup,
        away: buildTeam(clubId("away"), seed + 1000).setup,
      });
      for (const line of renderCommentary(events, seed, names, SHIPPED)) {
        expect(line.text, line.tag).not.toMatch(/\{\w+\}/);
        expect(line.text.trim(), line.tag).not.toBe("");
      }
    }
  });
});

describe("a player's edited commentary file", () => {
  it("uses the player's lines for a section, with {player} and {team} filled", () => {
    const { table, problems } = edited("[Foul]\n{player} clatters into his man. {team} concede a free kick.\n");
    expect(problems).toEqual([]);
    const [, line] = renderCommentary([started, foul], 1, names, table);
    expect(line!.text).toBe("Player p9 clatters into his man. United concede a free kick.");
  });

  it("fills {team2} with the other club", () => {
    const { table } = edited("[Foul]\n{player} of {team} fouls a {team2} player.\n");
    expect(renderCommentary([started, foul], 1, names, table)[1]!.text).toBe("Player p9 of United fouls a Rovers player.");
  });

  it("skips a line with a placeholder its section doesn't have, and says where", () => {
    const { table, problems } = edited("[Foul]\n{player} trips {player2}.\n{player} goes in late.\n");
    expect(table.templates.Foul).toEqual(["{player} goes in late."]);
    expect(problems).toEqual([expect.stringMatching(/^line 2: skipped, \{player2\} isn't available in \[Foul\]/)]);
  });

  it("keeps the game's own lines for a section the player left out or emptied", () => {
    const { table, problems } = edited("[Foul]\n{player2} only.\n");
    expect(table.templates.Foul).toEqual(SHIPPED.templates.Foul);
    expect(table.templates.Offside).toEqual(SHIPPED.templates.Offside);
    expect(problems).toContain("[Foul] has no usable lines, so the game's own are used");
  });

  it("reads delay, flash and chance, and falls back for the settings it isn't given", () => {
    const { table, problems } = edited("[Foul]\ndelay = 500\nflash = yes\nchance = 25\nFoul!\n[Offside]\nOffside!\n");
    expect(problems).toEqual([]);
    expect(table.playback.Foul).toEqual({ delayMs: 500, flash: true, displayChance: 0.25, level: SHIPPED.playback.Foul.level });
    expect(table.playback.Offside).toEqual(SHIPPED.playback.Offside);
  });

  it("never lets a moment that changes the match go unshown", () => {
    const { table, problems } = edited("[Goal:header]\nchance = 10\n{player} scores.\n");
    expect(table.playback["Goal:header"].displayChance).toBe(1);
    expect(problems).toEqual([expect.stringMatching(/^line 2: \[Goal:header\] changes the match/)]);
  });

  it("reports bad settings, unknown sections and stray lines, and skips them", () => {
    const { problems } = edited("stray\n[Fowl]\nnobody reads this\n[Foul]\ndelay = soon\nflash = maybe\nchance = 150\nFoul!\nA||B\n");
    expect(problems).toEqual([
      "line 1: comes before any [Section], so it is skipped",
      "line 2: there is no section [Fowl]; its lines are skipped",
      "line 5: delay must be a whole number of milliseconds from 0 to 60000",
      "line 6: flash must be yes or no",
      "line 7: chance must be a percentage from 0 to 100",
      "line 9: skipped, a | leaves an empty part",
    ]);
  });

  it("reads Windows line endings and a byte-order mark", () => {
    const { table, problems } = edited("﻿# edited in Notepad\r\n[Foul]\r\ndelay = 700\r\n{player} fouls.\r\n");
    expect(problems).toEqual([]);
    expect(table.templates.Foul).toEqual(["{player} fouls."]);
    expect(table.playback.Foul.delayMs).toBe(700);
  });
});

describe("the goalkeeper in commentary (cm-style-commentary 07)", () => {
  it("names the defending side's keeper on every save and goal, without changing the match", () => {
    for (const seed of [3, 11, 42]) {
      const home = buildTeam(clubId("home"), seed).setup;
      const away = buildTeam(clubId("away"), seed + 1000).setup;
      const playersOf = (setup: typeof home) => new Set(setup.squad.map((player) => String(player.id)));
      const events = simulateMatch({ seed, home, away });
      const keeperEvents = events.filter((event) => event._tag === "ShotOnTarget" || event._tag === "Goal");
      expect(keeperEvents.length).toBeGreaterThan(0);
      for (const event of keeperEvents) {
        if (event._tag !== "ShotOnTarget" && event._tag !== "Goal") continue;
        const defending = event.teamClubId === clubId("home") ? away : home;
        expect(playersOf(defending).has(String(event.keeperId))).toBe(true);
      }
    }
  });

  it("names the keeper in a save line that asks for him, and never leaves {player2} unfilled without one", () => {
    const { table } = edited("[ShotOnTarget:closeRange]\n{player} shoots…|{player2} saves.\n{player} shoots…|saved.\n");
    const shot = (keeperId?: string): MatchEvent => ({
      _tag: "ShotOnTarget",
      minute: 5,
      half: 1,
      teamClubId: clubId("home"),
      playerId: playerId("p1"),
      chanceType: "throughBall",
      ...(keeperId === undefined ? {} : { keeperId: playerId(keeperId) }),
    });
    const withKeeper = renderCommentary([started, shot("gk"), shot("gk")], 1, names, table).slice(1).map((line) => line.text);
    expect(withKeeper).toContain("Player p1 shoots… Player gk saves.");
    for (const seed of [1, 2, 3, 4]) {
      const [, line] = renderCommentary([started, shot()], seed, names, table);
      expect(line!.text).toBe("Player p1 shoots… saved.");
    }
  });
});

describe("the live pace the shipped file sets (cm-style-commentary 06)", () => {
  /** Seconds a match's commentary holds the bar at speed factor 1 (Normal): every shown line's parts. */
  const playSeconds = (seed: number): number => {
    const events = simulateMatch({
      seed,
      home: buildTeam(clubId("home"), seed).setup,
      away: buildTeam(clubId("away"), seed + 1000).setup,
    });
    const lines = renderCommentary(events, seed, names, SHIPPED).filter((line) => !line.quiet);
    return lines.reduce((total, line) => total + line.parts.reduce((sum, part) => sum + part.delayMs, 0), 0) / 1000;
  };

  it("plays a match at Normal in about a minute and a half", () => {
    const seconds = Array.from({ length: 40 }, (_, index) => playSeconds(index + 1));
    const average = seconds.reduce((total, value) => total + value, 0) / seconds.length;
    // Measured 2026-10-01 over 200 seeds: 86 s on average, 58 s to 110 s from the 10th to the 90th
    // percentile. Delays that drift far from that change how long every live match takes.
    expect(average).toBeGreaterThan(60);
    expect(average).toBeLessThan(120);
  });
});

describe("highlight levels (cm-style-commentary 08)", () => {
  it("reads a section's level and puts it on its lines", () => {
    const { table, problems } = edited("[Foul]\nlevel = extended\n{player} fouls.\n");
    expect(problems).toEqual([]);
    expect(table.playback.Foul.level).toBe("extended");
    expect(renderCommentary([started, foul], 1, names, table)[1]!.level).toBe("extended");
  });

  it("keeps every moment that changes the match at key", () => {
    const { table, problems } = edited("[RedCard]\nlevel = full\n{player} is off.\n[Corner]\nlevel = sometimes\nCorner.\n");
    expect(table.playback.RedCard.level).toBe("key");
    expect(problems).toEqual([
      "line 2: [RedCard] changes the match, so it is always key; level is ignored",
      "line 5: level must be key, extended or full",
    ]);
  });

  it("ships shots at key, build-up at extended and fouls at full", () => {
    expect(SHIPPED.playback["ShotOnTarget:closeRange"].level).toBe("key");
    expect(SHIPPED.playback.Counter.level).toBe("extended");
    expect(SHIPPED.playback["KeyPass:cross"].level).toBe("extended");
    expect(SHIPPED.playback.Foul.level).toBe("full");
  });
});
