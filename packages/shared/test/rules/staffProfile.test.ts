import { describe, expect, it } from "vitest";
import {
  NATION_LANGUAGE,
  STAFF_COACHING_RATINGS,
  STAFF_MENTAL_RATINGS,
  ageOn,
  deriveStaffProfile,
  parseStaffKey,
  staffKey,
  staffOpinion,
  type ClubPersonRole,
} from "../../src/index.js";

const base = {
  worldSeed: 77,
  clubId: "club_eng_1_03",
  ordinal: 0,
  clubNation: "ENG" as const,
  statureTier: "mid" as const,
  careerStart: "2026-07-01",
  otherClubs: ["club_eng_1_01", "club_eng_1_02", "club_eng_1_03", "club_eng_1_04", "club_eng_1_05"],
};

describe("staff keys", () => {
  it("round-trips a role and ordinal", () => {
    expect(staffKey("scout", 2)).toBe("scout-2");
    expect(parseStaffKey("scout-2")).toEqual({ role: "scout", ordinal: 2 });
    expect(parseStaffKey("assistant-0")).toEqual({ role: "assistant", ordinal: 0 });
  });

  it("rejects a key that names no role or a malformed ordinal", () => {
    expect(parseStaffKey("chef-0")).toBeNull();
    expect(parseStaffKey("coach-01")).toBeNull();
    expect(parseStaffKey("coach")).toBeNull();
  });
});

describe("a staff profile", () => {
  it("is the same on every derivation and different for a different person", () => {
    const coach = deriveStaffProfile({ ...base, role: "coach", quality: 12 });
    expect(deriveStaffProfile({ ...base, role: "coach", quality: 12 })).toEqual(coach);
    expect(deriveStaffProfile({ ...base, role: "assistant", quality: null })).not.toEqual(coach);
    expect(deriveStaffProfile({ ...base, role: "coach", quality: 12, clubId: "club_eng_1_04" })).not.toEqual(coach);
  });

  it("shows a Bound Staff member's stored quality as their trade's rating, exactly", () => {
    for (let quality = 1; quality <= 20; quality++) {
      const coach = deriveStaffProfile({ ...base, role: "coach", quality });
      expect(coach.coaching?.coachingOutfieldPlayers).toBe(quality);
      const scout = deriveStaffProfile({ ...base, role: "scout", ordinal: 1, quality });
      expect(scout.mental?.judgingPlayerAbility).toBe(quality);
    }
  });

  it("keeps every rating on the 1-20 scale for every role and anchor", () => {
    const roles: readonly ClubPersonRole[] = ["coach", "assistant", "scout", "physio"];
    for (const role of roles) {
      for (let seed = 1; seed <= 50; seed++) {
        const profile = deriveStaffProfile({
          ...base,
          worldSeed: seed,
          role,
          quality: role === "coach" || role === "scout" ? ((seed % 20) + 1) : null,
        });
        for (const key of STAFF_COACHING_RATINGS) {
          expect(profile.coaching?.[key]).toBeGreaterThanOrEqual(1);
          expect(profile.coaching?.[key]).toBeLessThanOrEqual(20);
        }
        for (const key of STAFF_MENTAL_RATINGS) {
          expect(profile.mental?.[key]).toBeGreaterThanOrEqual(1);
          expect(profile.mental?.[key]).toBeLessThanOrEqual(20);
        }
      }
    }
  });

  it("gives the President a biography and no ratings or tactics", () => {
    const president = deriveStaffProfile({ ...base, role: "president", quality: null });
    expect(president.coaching).toBeNull();
    expect(president.mental).toBeNull();
    expect(president.tactics).toBeNull();
    expect(president.history).toEqual([]);
    expect(president.languages).toEqual(["English"]);
  });

  it("gives tactical preferences to the Coach and the Assistant Manager only", () => {
    expect(deriveStaffProfile({ ...base, role: "coach", quality: 10 }).tactics).not.toBeNull();
    expect(deriveStaffProfile({ ...base, role: "assistant", quality: null }).tactics).not.toBeNull();
    expect(deriveStaffProfile({ ...base, role: "scout", quality: 10 }).tactics).toBeNull();
    expect(deriveStaffProfile({ ...base, role: "physio", quality: null }).tactics).toBeNull();
  });

  it("measures age, joining and history against the career start, never after it", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const profile = deriveStaffProfile({ ...base, worldSeed: seed, role: "coach", quality: 10 });
      const age = ageOn(profile.dateOfBirth, base.careerStart);
      expect(age).toBeGreaterThanOrEqual(36);
      expect(age).toBeLessThanOrEqual(65);
      expect(profile.joined <= base.careerStart).toBe(true);
      let toYear = Number(profile.joined.slice(0, 4));
      for (const spell of profile.history) {
        expect(spell.toYear).toBe(toYear);
        expect(spell.fromYear).toBeLessThan(spell.toYear);
        expect(spell.clubId).not.toBe(base.clubId);
        toYear = spell.fromYear;
      }
      expect(new Set(profile.history.map((spell) => spell.clubId)).size).toBe(profile.history.length);
    }
  });

  it("speaks the club nation's language first, each language once", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const profile = deriveStaffProfile({ ...base, worldSeed: seed, clubNation: "BRA", role: "assistant", quality: null });
      expect(profile.languages[0]).toBe(NATION_LANGUAGE.BRA);
      expect(new Set(profile.languages).size).toBe(profile.languages.length);
    }
  });

  it("does not depend on the order the candidate clubs arrive in", () => {
    const forward = deriveStaffProfile({ ...base, role: "coach", quality: 9 });
    const reversed = deriveStaffProfile({ ...base, role: "coach", quality: 9, otherClubs: [...base.otherClubs].reverse() });
    expect(reversed).toEqual(forward);
  });
});

describe("a staff member's opinion of a player", () => {
  it("is exact for a perfect judge and bounded by eight points for the worst", () => {
    expect(staffOpinion({ positionRating: 14, judgingPlayerAbility: 20, seed: 3 })).toBe(14);
    for (let seed = 1; seed <= 200; seed++) {
      const opinion = staffOpinion({ positionRating: 14, judgingPlayerAbility: 1, seed });
      expect(Math.abs(opinion - 14)).toBeLessThanOrEqual(8);
    }
  });
});
