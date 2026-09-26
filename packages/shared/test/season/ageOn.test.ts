import { describe, expect, it } from "vitest";
import { ageOn } from "../../src/season/calendar.js";

describe("ageOn", () => {
  it("counts the year on the birthday itself", () => {
    expect(ageOn("2008-08-15", "2026-08-15")).toBe(18);
  });

  it("is a year younger the day before the birthday", () => {
    expect(ageOn("2008-08-15", "2026-08-14")).toBe(17);
    expect(ageOn("2008-08-15", "2026-07-31")).toBe(17);
  });

  it("keeps the year after the birthday", () => {
    expect(ageOn("2008-08-15", "2026-08-16")).toBe(18);
    expect(ageOn("2008-08-15", "2026-12-31")).toBe(18);
  });

  it("counts a 29 February birthday as passed from 1 March in a non-leap year", () => {
    expect(ageOn("2008-02-29", "2027-02-28")).toBe(18);
    expect(ageOn("2008-02-29", "2027-03-01")).toBe(19);
    expect(ageOn("2008-02-29", "2028-02-29")).toBe(20);
  });

  it("is zero on the day of birth", () => {
    expect(ageOn("2026-01-01", "2026-01-01")).toBe(0);
  });

  it("rejects a date that is not ISO YYYY-MM-DD", () => {
    expect(() => ageOn("15/08/2008", "2026-08-15")).toThrow(/not an ISO date/);
    expect(() => ageOn("2008-08-15", "2026-08-15T10:00:00Z")).toThrow(/not an ISO date/);
  });
});
