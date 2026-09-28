import { describe, expect, it } from "vitest";
import {
  BEST_PRACTICE_TIRED_BELOW,
  CONGESTION_DAYS,
  bestPracticeSchedule,
  type BestPracticeInput,
} from "../../src/rules/assistantSchedule.js";

const input = (over: Partial<BestPracticeInput> = {}): BestPracticeInput => ({
  daysToNextFixture: 7,
  daysFromNextToFollowing: 7,
  meanCondition: 95,
  ...over,
});

describe("the assistant's Best Practice rule", () => {
  it.each([
    ["a normal gap", input(), "balanced"],
    ["no Fixture left", input({ daysToNextFixture: null, daysFromNextToFollowing: null }), "balanced"],
    ["a short gap", input({ daysToNextFixture: 3 }), "matchPreparation"],
    ["a congested run", input({ daysFromNextToFollowing: CONGESTION_DAYS }), "recovery"],
    ["a tired squad", input({ meanCondition: BEST_PRACTICE_TIRED_BELOW - 1 }), "recovery"],
    ["a tired squad before a short gap", input({ meanCondition: 70, daysToNextFixture: 2 }), "recovery"],
    ["a squad exactly at the line", input({ meanCondition: BEST_PRACTICE_TIRED_BELOW }), "balanced"],
    ["a gap just past congestion", input({ daysFromNextToFollowing: CONGESTION_DAYS + 1 }), "balanced"],
  ] as const)("picks the right template for %s", (_label, given, template) => {
    expect(bestPracticeSchedule(given).template).toBe(template);
  });

  it("never picks Heavy, and always gives a reason", () => {
    for (const days of [null, 1, 2, 3, 4, 7, 14]) {
      for (const following of [null, 2, 4, 5, 10]) {
        for (const meanCondition of [40, 75, 84, 85, 100]) {
          const choice = bestPracticeSchedule({ daysToNextFixture: days, daysFromNextToFollowing: following, meanCondition });
          expect(choice.template).not.toBe("heavy");
          expect(choice.reason.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("gives the same answer for the same inputs", () => {
    const given = input({ meanCondition: 80 });
    expect(bestPracticeSchedule(given)).toEqual(bestPracticeSchedule(given));
  });
});
