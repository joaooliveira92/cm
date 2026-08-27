import { describe, expect, it } from "vitest";
import type { MatchEvent } from "@cm-clone/game-engine";
import { COMMENTARY_TEMPLATES, renderCommentary } from "../src/commentary.js";

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
  teamClubId: "home",
  playerId: "p1",
  trigger,
  severity,
  tier: severity === "severe" ? "red" : "orange",
  type: type as "hamstring",
});

describe("injury commentary", () => {
  it("keys the injury pool by severity", () => {
    expect(COMMENTARY_TEMPLATES["Injury:light"]).toBeDefined();
    expect(COMMENTARY_TEMPLATES["Injury:medium"]).toBeDefined();
    expect(COMMENTARY_TEMPLATES["Injury:severe"]).toBeDefined();
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
    ];
    for (const line of renderCommentary(events, 5, names)) {
      expect(line.text).not.toMatch(/\{\w+\}/);
    }
  });
});