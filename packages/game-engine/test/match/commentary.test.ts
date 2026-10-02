import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../src/match/events.js";
import { ALWAYS_SHOWN, FOLLOW_ON_DELAY_MS } from "../../src/match/commentarySections.js";
import { parseCommentaryFile } from "../../src/match/commentaryFile.js";
import { renderCommentary as renderWith } from "../../src/match/commentary.js";
import { SHIPPED, renderShipped as renderCommentary } from "./shippedCommentary.js";

const COMMENTARY_TEMPLATES = SHIPPED.templates;

/** `MatchEvent`'s ids are branded in `@cm-clone/contracts`, which depends on this package — so this
 * package can't import the brands back without a cycle. Fixtures mint them off the event type. */
type InjuryEvent = Extract<MatchEvent, { readonly _tag: "Injury" }>;
const clubId = (value: string) => value as InjuryEvent["teamClubId"];
const playerId = (value: string) => value as InjuryEvent["playerId"];

const names = {
  clubName: (id: string) => (id === "home" ? "Home" : "Away"),
  playerName: (id: string) => (id === "p1" ? "P One" : "P Two"),
};

const injury = (
  severity: "light" | "medium" | "severe",
  trigger: "contact" | "non-contact",
  type: string,
): MatchEvent => ({
  _tag: "Injury",
  minute: 70,
  half: 1,
  teamClubId: clubId("home"),
  playerId: playerId("p1"),
  trigger,
  severity,
  tier: severity === "severe" ? "red" : "orange",
  type: type as "hamstring",
});

describe("injury commentary", () => {
  it("keys the injury pools by trigger and severity", () => {
    expect(COMMENTARY_TEMPLATES["Injury:contact:light"]).toBeDefined();
    expect(COMMENTARY_TEMPLATES["Injury:contact:medium"]).toBeDefined();
    expect(COMMENTARY_TEMPLATES["Injury:contact:severe"]).toBeDefined();
    expect(COMMENTARY_TEMPLATES["Injury:non-contact:light"]).toBeDefined();
    expect(COMMENTARY_TEMPLATES["Injury:non-contact:medium"]).toBeDefined();
    expect(COMMENTARY_TEMPLATES["Injury:non-contact:severe"]).toBeDefined();
  });

  it("fills the player and team tokens for a light knock", () => {
    const lines = renderCommentary([injury("light", "non-contact", "strain")], 1, names);
    expect(lines[0]!.text).toContain("P One");
    expect(lines[0]!.text).toContain("Home");
  });

  it("fills the body-part token for a contact injury", () => {
    const lines = renderCommentary([injury("medium", "contact", "brokenToe")], 1, names);
    expect(lines[0]!.text.toLowerCase()).toContain("toe");
  });

  it("fills the body-part token for a non-contact injury", () => {
    const lines = renderCommentary([injury("medium", "non-contact", "hamstring")], 1, names);
    expect(lines[0]!.text.toLowerCase()).toContain("hamstring");
  });

  it("renders contact and non-contact injuries of the same severity differently", () => {
    const contact = renderCommentary([injury("severe", "contact", "twistedAnkle")], 1, names)[0]!.text;
    const nonContact = renderCommentary([injury("severe", "non-contact", "hamstring")], 1, names)[0]!.text;
    expect(contact).not.toBe(nonContact);
  });

  it("narrates every contact injury as a challenge and every non-contact one as pulling up", () => {
    for (const severity of ["light", "medium", "severe"] as const) {
      for (const line of COMMENTARY_TEMPLATES[`Injury:contact:${severity}`]) expect(line).toMatch(/challenge|tackle|collision/);
      for (const line of COMMENTARY_TEMPLATES[`Injury:non-contact:${severity}`]) expect(line).toMatch(/pull(s|ing)? up|tired muscle|no one near/i);
    }
  });

  it("narrates severe injuries distinctly from light ones (stretcher imagery)", () => {
    const light = renderCommentary([injury("light", "non-contact", "strain")], 1, names)[0]!.text;
    const severe = renderCommentary([injury("severe", "non-contact", "hamstring")], 2, names)[0]!.text;
    expect(light).not.toBe(severe);
  });

  it("never leaves a placeholder token unfilled", () => {
    const events = [
      injury("light", "non-contact", "strain"),
      injury("medium", "contact", "twistedAnkle"),
      injury("severe", "contact", "deadLeg"),
      injury("severe", "non-contact", "calf"),
    ];
    for (const line of renderCommentary(events, 5, names)) {
      expect(line.text).not.toMatch(/\{\w+\}/);
    }
  });
});
describe("commentary reads the events around a line", () => {
  const home = clubId("home");
  const away = clubId("away");
  const started: MatchEvent = { _tag: "MatchStarted", seed: 1, homeClubId: home, awayClubId: away };
  const goal = (minute: number, team: typeof home, homeScore: number, awayScore: number): MatchEvent => ({
    _tag: "Goal",
    minute,
    half: 1,
    teamClubId: team,
    playerId: playerId("p1"),
    homeScore,
    awayScore,
    chanceType: "throughBall",
  });
  const textOf = (events: ReadonlyArray<MatchEvent>, seed = 1) => renderCommentary(events, seed, names).map((line) => line.text);

  it("names both sides in every scoreline, and says what the goal did to it", () => {
    const [, opener, equaliser, lead, extend, reply] = textOf([
      started,
      goal(10, home, 1, 0),
      goal(20, away, 1, 1),
      goal(30, home, 2, 1),
      goal(40, home, 3, 1),
      goal(50, away, 3, 2),
    ]);
    expect(opener).toContain("Home 1-0 Away");
    expect(opener).toMatch(/lead|opener|in front|first blood/i);
    expect(equaliser).toMatch(/level|equaliser|square|back in it/);
    expect(lead).toMatch(/ahead|lead|turn it around/);
    expect(extend).toMatch(/extend|pulling away|Another/);
    expect(reply).toMatch(/back|reply/);
  });

  it("narrates a penalty's shot as a penalty, not as open play", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const [, , shot] = textOf(
        [
          started,
          { _tag: "Penalty", minute: 60, half: 2, teamClubId: home, playerId: playerId("p1") },
          { _tag: "ShotMissed", minute: 60, half: 2, teamClubId: home, playerId: playerId("p1"), chanceType: "throughBall" },
        ],
        seed,
      );
      const filled = { player: "P One", he: "he", him: "him", his: "his", He: "He", His: "His" } as Record<string, string>;
      const penaltyMisses = COMMENTARY_TEMPLATES["ShotMissed:penalty"].map((t) =>
        t.replace(/\{(\w+)\}/g, (_, name: string) => filled[name] ?? name).replace("|", " "),
      );
      expect(penaltyMisses).toContain(shot);
    }
  });

  it("has the key pass name the finisher the chance event carries", () => {
    const [, , keyPass] = textOf([
      started,
      { _tag: "Cross", minute: 5, half: 1, teamClubId: home, playerId: playerId("p2"), assistPlayerId: playerId("p1") },
      { _tag: "KeyPass", minute: 5, half: 1, teamClubId: home, playerId: playerId("p1"), chanceType: "cross" },
    ]);
    expect(keyPass).toContain("P One");
    expect(keyPass).toContain("P Two");
  });

  it("names the winner at full time, and calls a level score a draw", () => {
    const [, win] = textOf([started, { _tag: "FullTimeWhistle", minute: 90, homeScore: 0, awayScore: 2 }]);
    expect(win).toContain("Home 0-2 Away");
    const { table } = parseCommentaryFile("[FullTimeWhistle:win]\n{team} beat {team2}, {score}.\n", SHIPPED);
    expect(renderWith([started, { _tag: "FullTimeWhistle", minute: 90, homeScore: 0, awayScore: 2 }], 1, names, table)[1]!.text).toBe(
      "Away beat Home, Home 0-2 Away.",
    );
    const [, draw] = textOf([started, { _tag: "FullTimeWhistle", minute: 90, homeScore: 1, awayScore: 1 }]);
    expect(draw).not.toMatch(/\bwin\b|\bbeat\b/);
  });

  it("uses no template twice until its pool is spent", () => {
    const fouls: ReadonlyArray<MatchEvent> = COMMENTARY_TEMPLATES.Foul.map((_, minute) => ({
      _tag: "Foul",
      minute,
      half: 1,
      teamClubId: home,
      playerId: playerId("p1"),
      isYellowCard: false,
    }));
    for (const seed of [1, 7, 99]) {
      const lines = textOf([started, ...fouls], seed).slice(1);
      expect(new Set(lines).size).toBe(COMMENTARY_TEMPLATES.Foul.length);
    }
  });

  it("leaves earlier lines unchanged when the events after them change", () => {
    const before = textOf([started, goal(10, home, 1, 0), goal(20, home, 2, 0)]);
    const after = textOf([started, goal(10, home, 1, 0), goal(20, away, 1, 1), goal(30, away, 1, 2)]);
    expect(after.slice(0, 2)).toEqual(before.slice(0, 2));
  });


});

describe("commentary playback, after Championship Manager's events file", () => {
  const home = clubId("home");
  const started: MatchEvent = { _tag: "MatchStarted", seed: 1, homeClubId: home, awayClubId: clubId("away") };

  it("splits a shot into a build-up that holds, and an outcome carrying the scoreline", () => {
    const [, line] = renderCommentary(
      [started, { _tag: "Goal", minute: 9, half: 1, teamClubId: home, playerId: playerId("p1"), homeScore: 1, awayScore: 0, chanceType: "cross" }],
      1,
      names,
    );
    expect(line!.parts).toHaveLength(2);
    expect(line!.parts[0]!.delayMs).toBe(FOLLOW_ON_DELAY_MS);
    expect(line!.parts[1]!.text).toMatch(/^GOAL!.*Home 1-0 Away\.$/);
    expect(line!.parts[1]!.delayMs).toBe(SHIPPED.playback["Goal:header"].delayMs);
    expect(line!.text).toBe(line!.parts.map((part) => part.text).join(" "));
    expect(line!.flash).toBe(true);
    expect(line!.clubId).toBe("home");
  });

  it("always shows the lines that change the match, and only sometimes the minor ones", () => {
    const fouls: ReadonlyArray<MatchEvent> = Array.from({ length: 200 }, (_, minute) => ({
      _tag: "Foul", minute, half: 1, teamClubId: home, playerId: playerId("p1"), isYellowCard: false,
    }));
    const quiet = renderCommentary([started, ...fouls], 3, names).filter((line) => line.quiet).length;
    expect(quiet).toBeGreaterThan(20);
    expect(quiet).toBeLessThan(110);
    const goals = renderCommentary(
      [started, { _tag: "Goal", minute: 9, half: 1, teamClubId: home, playerId: playerId("p1"), homeScore: 1, awayScore: 0, chanceType: "cross" }],
      3,
      names,
    );
    expect(goals.some((line) => line.quiet)).toBe(false);
  });

  it("never gives a line that changes the match a display chance", () => {
    for (const [key, playback] of Object.entries(SHIPPED.playback)) {
      if (ALWAYS_SHOWN.has(key.split(":")[0] as never)) expect(playback.displayChance, key).toBe(1);
    }
  });
});

describe("pronouns (cm-style-commentary 13)", () => {
  const home = clubId("home");
  const started: MatchEvent = { _tag: "MatchStarted", seed: 1, homeClubId: home, awayClubId: clubId("away") };
  const foul: MatchEvent = { _tag: "Foul", minute: 3, half: 1, teamClubId: home, playerId: playerId("p1"), isYellowCard: false };
  const { table } = parseCommentaryFile("[Foul]\n{He} catches {his} man, and {player} knows {he} was late. Book {him}.\n", SHIPPED);

  it("fills he, him and his for the line's player, capitalised where the line asks", () => {
    expect(renderWith([started, foul], 1, names, table)[1]!.text).toBe("He catches his man, and P One knows he was late. Book him.");
  });

  it("asks the resolver for a player's pronouns when it has them", () => {
    const withPronouns = { ...names, pronounsOf: () => ({ he: "she", him: "her", his: "her" }) };
    expect(renderWith([started, foul], 1, withPronouns, table)[1]!.text).toBe("She catches her man, and P One knows she was late. Book her.");
  });

  it("leaves no bare he, him or his about a player in the shipped file", () => {
    const bare = /(?<!\{)\b(he|him|his|He|His)\b(?!\})/;
    const offenders = Object.entries(COMMENTARY_TEMPLATES).flatMap(([key, pool]) =>
      pool.filter((line) => bare.test(line)).map((line) => `[${key}] ${line}`),
    );
    // The referee's pocket and watch, and the manager's area, are theirs, not a player's.
    expect(offenders).toEqual([
      "[YellowCard] The referee goes to his pocket: a yellow for {player}.",
      "[YellowCard] Yellow card for {player}. The referee reaches for his pocket.",
      "[HalfTimeReached] The referee checks his watch and blows. {score}.",
      "[TacticsChanged:instructions] The {team} manager is on the edge of his area, changing the approach.",
    ]);
  });
});

describe("a tactics change", () => {
  const home = clubId("home");
  const started: MatchEvent = { _tag: "MatchStarted", seed: 1, homeClubId: home, awayClubId: clubId("away") };
  const change = (fromFormationLabel: string, toFormationLabel: string): MatchEvent => ({
    _tag: "TacticsChanged", minute: 60, half: 2, teamClubId: home, fromFormationLabel, toFormationLabel,
  });

  it("names the new formation only when the shape really changed", () => {
    const { table } = parseCommentaryFile("[TacticsChanged:shape]\nNow {formation}.\n[TacticsChanged:instructions]\nNew instructions.\n", SHIPPED);
    const texts = renderWith([started, change("4-4-2", "4-3-3"), change("", "ultraDefensive"), change("4-4-2", "4-4-2")], 1, names, table)
      .slice(1)
      .map((line) => line.text);
    expect(texts).toEqual(["Now 4-3-3.", "New instructions.", "New instructions."]);
  });
});
