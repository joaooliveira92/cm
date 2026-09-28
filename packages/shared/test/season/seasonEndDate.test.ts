import { describe, expect, it } from "vitest";
import {
  CUP_ROUND_CAPACITY,
  cupRoundDate,
  seasonEndDate,
  seasonSlots,
  seasonStartDate,
  seasonStartYear,
} from "../../src/season/calendar.js";

describe("seasonEndDate", () => {
  it("is 31 May of the year after the season starts", () => {
    expect(seasonEndDate(2026, 1)).toBe("2027-05-31");
    expect(seasonEndDate(2026, 3)).toBe("2029-05-31");
  });

  // A season spanning a 29 February (2027/28) or not (2026/27) ends on the same calendar day, and
  // no slot the calendar can hand out lies past it, so no fixture can conclude a season later.
  it.each([1, 2, 3])("bounds every slot of season %i, leap year or not", (seasonNumber) => {
    const end = seasonEndDate(2026, seasonNumber);
    const slots = seasonSlots(seasonStartYear(2026, seasonNumber));
    const every = [...slots.leagueWeekendDates, ...slots.midweekDates, ...slots.cupRoundDates];

    expect(every.every((date) => date <= end)).toBe(true);
    expect(cupRoundDate(seasonStartYear(2026, seasonNumber), CUP_ROUND_CAPACITY)! <= end).toBe(true);
    expect(seasonStartDate(2026, seasonNumber) < end).toBe(true);
    expect(end < seasonStartDate(2026, seasonNumber + 1)).toBe(true);
  });
});
