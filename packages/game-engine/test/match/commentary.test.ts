import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../src/match/events.js";
import { COMMENTARY_TEMPLATES, renderCommentary } from "../../src/match/commentary.js";

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

  it("uses structural phrasing for contact and muscular/fatigue phrasing for non-contact", () => {
    const contact = renderCommentary([injury("medium", "contact", "twistedAnkle")], 1, names)[0]!.text.toLowerCase();
    const nonContact = renderCommentary([injury("medium", "non-contact", "hamstring")], 1, names)[0]!.text.toLowerCase();
    expect(contact).toMatch(/challenge|tackle|collision/);
    expect(nonContact).toMatch(/pulls up|tired muscle|no one near/);
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