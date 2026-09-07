import { describe, expect, it } from "vitest";
import { CareerSetupCompetitionBand } from "@cm-clone/contracts";
import {
  describeCompetitions,
  describeStaff,
} from "../../../src/renderer/create/careerSetupSummary.js";

/** The sentences the Review step builds out of the counted world. */

const band = (depth: "full" | "standard" | "results-only", competitionCount: number, clubCount: number) =>
  new CareerSetupCompetitionBand({ depth, competitionCount, clubCount });

describe("describeCompetitions", () => {
  it("names each band with the depth vocabulary the Active Leagues grid uses", () => {
    expect(describeCompetitions([band("full", 3, 60), band("standard", 2, 40)])).toBe(
      "3 competitions at Full depth (60 clubs), 2 competitions at Standard depth (40 clubs)",
    );
    expect(describeCompetitions([band("results-only", 4, 80)])).toBe(
      "4 competitions at Results only depth (80 clubs)",
    );
  });

  it("agrees in number, so a one-league career does not read as a bug", () => {
    expect(describeCompetitions([band("full", 1, 1)])).toBe(
      "1 competition at Full depth (1 club)",
    );
  });

  it("says nothing about a depth the world does not reach", () => {
    // Only the band that exists is described. A zero row for the other two would claim the scope
    // reaches depths it does not, which is what the server omitting empty bands prevents.
    expect(describeCompetitions([band("full", 1, 19)])).toBe(
      "1 competition at Full depth (19 clubs)",
    );
  });

  it("has an answer for a world with no competitions at all", () => {
    expect(describeCompetitions([])).toBe("None");
  });
});

describe("describeStaff", () => {
  it("explains the zero rather than printing it — no backroom exists before the commit", () => {
    expect(describeStaff(0)).toBe("Appointed when the career is created");
  });

  it("reports a real headcount the moment there is one", () => {
    expect(describeStaff(4)).toBe("4");
    expect(describeStaff(1200)).toBe("1,200");
  });
});
