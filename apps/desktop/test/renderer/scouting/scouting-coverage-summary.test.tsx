// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  ClubId,
  KnowledgeClubView,
  KnowledgePlayerView,
  PlayerId,
  ScoutingKnowledgeView,
} from "@cm-clone/contracts";
import {
  ScoutingCoverageSummary,
  coverageLabel,
  scoutingProgressLabel,
} from "../../../src/renderer/scouting/ScoutingCoverageSummary.js";

/**
 * Group-i ticket 05: the coverage summary is props-only, so the Scouting Centre (Screen 118) can
 * render it with no router, no atoms and no RPC. These tests mount it bare to prove exactly that.
 */

afterEach(() => cleanup());

const club = (overrides: Partial<ConstructorParameters<typeof KnowledgeClubView>[0]> = {}) =>
  new KnowledgeClubView({
    clubId: ClubId.make("club-7"),
    clubName: "Northport Rovers",
    squadSize: 20,
    scoutedCount: 2,
    fullyScoutedCount: 1,
    coverage: 0.07,
    knowledgeConfidence: "low",
    ...overrides,
  });

const player = (overrides: Partial<ConstructorParameters<typeof KnowledgePlayerView>[0]> = {}) =>
  new KnowledgePlayerView({
    playerId: PlayerId.make("p-1"),
    firstName: "Nico",
    lastName: "Striker",
    clubId: ClubId.make("club-7"),
    clubName: "Northport Rovers",
    progress: 40,
    ...overrides,
  });

describe("group-i ticket 05 — coverage summary", () => {
  it("counts scouted Clubs, scouted Players, Fully Scouted Players, and Clubs per Knowledge Confidence", () => {
    render(
      <ScoutingCoverageSummary
        knowledge={
          new ScoutingKnowledgeView({
            clubs: [
              club(),
              club({ clubId: ClubId.make("club-8"), clubName: "Westfield", knowledgeConfidence: "low" }),
              club({ clubId: ClubId.make("club-9"), clubName: "Eastvale United", knowledgeConfidence: "complete" }),
            ],
            players: [
              player(),
              player({ playerId: PlayerId.make("p-2"), progress: 100 }),
              player({ playerId: PlayerId.make("p-3"), progress: 12 }),
            ],
          })
        }
      />,
    );
    const summary = within(screen.getByRole("region", { name: "Scouting coverage" }));
    const valueOf = (term: string) => summary.getByText(term).nextElementSibling?.textContent;
    expect(valueOf("Clubs with scouted Players")).toBe("3");
    expect(valueOf("Players scouted")).toBe("3");
    expect(valueOf("Fully Scouted")).toBe("1");
    expect(valueOf("Knowledge Confidence")).toBe("Low: 2 Clubs · Complete: 1 Club");
  });

  it("reads as Unscouted when nothing has been scouted, rather than as zeros", () => {
    render(<ScoutingCoverageSummary knowledge={new ScoutingKnowledgeView({ clubs: [], players: [] })} />);
    const summary = screen.getByRole("region", { name: "Scouting coverage" });
    expect(summary.textContent).toBe("Nothing scouted yet. Every Player outside your squad is Unscouted.");
    expect(within(summary).queryByText("Clubs with scouted Players")).toBeNull();
  });

  it("formats Scouting Progress and coverage floored, with Fully Scouted at 100", () => {
    expect(scoutingProgressLabel(1)).toBe("1%");
    expect(scoutingProgressLabel(99.9)).toBe("99%");
    expect(scoutingProgressLabel(100)).toBe("Fully Scouted");
    expect(coverageLabel(0)).toBe("0%");
    expect(coverageLabel(0.999)).toBe("99%");
    expect(coverageLabel(1)).toBe("100%");
  });
});
