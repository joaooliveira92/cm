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
    expect(table.playback.Foul).toEqual({ delayMs: 500, flash: true, displayChance: 0.25 });
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
