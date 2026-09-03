import { describe, expect, it } from "vitest";
import {
  describeSecondaryRow,
  formatPosition,
  matchReadout,
  seasonReadout,
  type HeaderCareer,
} from "../src/renderer/chrome/header/career-header-state.js";

const season = { seasonNumber: 3, currentDate: "2026-10-17", phase: "in_season" } as const;

const career = (over: Partial<HeaderCareer> = {}): HeaderCareer => ({
  clubName: "Northport Rovers",
  saveName: "My Save",
  season,
  standing: { position: 4, played: 12, points: 24 },
  liveMatch: null,
  blockedReason: null,
  ...over,
});

const metricValue = (row: ReturnType<typeof describeSecondaryRow>, label: string) => {
  if (row.kind !== "career") throw new Error("expected a career row");
  return row.metrics.find((metric) => metric.label === label);
};

describe("seasonReadout", () => {
  it("stands on a date while the season is running", () => {
    expect(seasonReadout(season)).toBe("Season 3 · 17 Oct 2026");
  });

  it("names the phase instead of a date outside the in-season phase", () => {
    expect(seasonReadout({ ...season, phase: "pre_season" })).toBe("Season 3 · Pre-season");
    expect(seasonReadout({ ...season, phase: "season_complete" })).toBe(
      "Season 3 · Season complete",
    );
  });
});

describe("matchReadout", () => {
  it("reads in minutes, never a clock", () => {
    expect(
      matchReadout({
        currentMinute: 63,
        homeClubName: "Northport Rovers",
        homeScore: 2,
        awayClubName: "Eastvale",
        awayScore: 1,
      }),
    ).toBe("63' · Northport Rovers 2–1 Eastvale");
  });
});

describe("formatPosition", () => {
  it("reads League positions as ordinals", () => {
    expect(formatPosition(1)).toBe("1st");
    expect(formatPosition(2)).toBe("2nd");
    expect(formatPosition(3)).toBe("3rd");
    expect(formatPosition(4)).toBe("4th");
    expect(formatPosition(11)).toBe("11th");
    expect(formatPosition(12)).toBe("12th");
    expect(formatPosition(13)).toBe("13th");
    expect(formatPosition(21)).toBe("21st");
  });

  it("refuses to invent a position out of a non-position", () => {
    expect(formatPosition(0)).toBe("—");
    expect(formatPosition(Number.NaN)).toBe("—");
  });
});

describe("describeSecondaryRow", () => {
  it("reports the calendar and the standing on a loaded career", () => {
    const row = describeSecondaryRow({ view: "career", career: career() });

    expect(row.kind).toBe("career");
    expect(metricValue(row, "Calendar")?.value).toBe("Season 3 · 17 Oct 2026");
    expect(metricValue(row, "Position")?.value).toBe("4th");
    expect(metricValue(row, "Points")?.value).toBe("24");
    expect(metricValue(row, "Played")?.value).toBe("12");
    expect(metricValue(row, "Points")?.placeholder).toBe(false);
  });

  it("shows the save name as the status when the loop is free to advance", () => {
    const row = describeSecondaryRow({ view: "career", career: career() });
    if (row.kind !== "career") throw new Error("expected a career row");

    expect(row.status).toBe("My Save");
    expect(row.warning).toBeNull();
  });

  it("leaves the club to the band's identity zone rather than restating it", () => {
    const row = describeSecondaryRow({ view: "career", career: career() });
    if (row.kind !== "career") throw new Error("expected a career row");

    expect(row.metrics.some((metric) => metric.label === "Club")).toBe(false);
  });

  it("marks unloaded facts as placeholders rather than inventing them", () => {
    const row = describeSecondaryRow({ view: "career", career: career({ standing: null, season: null }) });

    expect(metricValue(row, "Position")?.value).toBe("—");
    expect(metricValue(row, "Position")?.placeholder).toBe(true);
    expect(metricValue(row, "Calendar")?.placeholder).toBe(true);
  });

  it("replaces the status with the live-match readout while a match is in flight", () => {
    const row = describeSecondaryRow({
      view: "career",
      career: career({
        liveMatch: {
          currentMinute: 63,
          homeClubName: "Northport Rovers",
          homeScore: 2,
          awayClubName: "Eastvale",
          awayScore: 1,
        },
        blockedReason: "The season cannot advance during a match.",
      }),
    });
    if (row.kind !== "career") throw new Error("expected a career row");

    expect(row.status).toBe("63' · Northport Rovers 2–1 Eastvale");
    expect(row.warning).toBe("The season cannot advance during a match.");
  });

  it("describes the pre-career shells without any career data", () => {
    expect(
      describeSecondaryRow({ view: "create", step: "Step 2 of 4 · Manager", hint: "Reversible" }),
    ).toEqual({
      kind: "wizard",
      heading: "Step 2 of 4 · Manager",
      hint: "Reversible",
    });
    expect(describeSecondaryRow({ view: "menu" }).kind).toBe("status");
    expect(describeSecondaryRow({ view: "load" }).kind).toBe("status");
  });
});
