import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { CoachAssignmentView, CoachingAssignmentsView } from "../src/schemas/index.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

describe("Coaching Assignments view (Screen 111)", () => {
  it("CoachAssignmentView round-trips a coach with id, name, quality, and department", () => {
    roundTrip(CoachAssignmentView, { id: "c1", name: "Beth Cross", quality: 14, department: "coaching" });
  });

  it("CoachAssignmentView rejects an invalid department", () => {
    expect(() =>
      Schema.decodeUnknownSync(CoachAssignmentView)({
        id: "c1",
        name: "Beth Cross",
        quality: 14,
        department: "not_a_department",
      }),
    ).toThrow();
  });

  it("CoachAssignmentView accepts a quality value within Schema.Finite range", () => {
    expect(() =>
      Schema.decodeSync(CoachAssignmentView)({
        id: "c1",
        name: "Beth Cross",
        quality: 100,
        department: "coaching",
      }),
    ).not.toThrow();
  });

  it("CoachingAssignmentsView round-trips a list of coaches", () => {
    roundTrip(CoachingAssignmentsView, {
      coaches: [
        { id: "c1", name: "Beth Cross", quality: 14, department: "coaching" },
        { id: "c2", name: "Mike Stone", quality: 9, department: "coaching" },
      ],
    });
  });

  it("CoachingAssignmentsView round-trips an empty list", () => {
    roundTrip(CoachingAssignmentsView, { coaches: [] });
  });

  it("is the getCoachingAssignments success schema", () => {
    expect(CoachingAssignmentsView).toBe(AppRpcs.getCoachingAssignments.success);
  });

  it("getCoachingAssignments payload round-trips a saveId", () => {
    roundTrip(AppRpcs.getCoachingAssignments.payload, { saveId: "s1" });
  });

  it("getCoachingAssignments error schema round-trips SaveNotFoundError", () => {
    roundTrip(AppRpcs.getCoachingAssignments.error, { _tag: "SaveNotFoundError", id: "s1" });
  });
});