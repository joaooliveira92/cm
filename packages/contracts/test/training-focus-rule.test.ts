import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

describe("SetTrainingFocus refuses a Category the player may not take", () => {
  it("TrainingFocusNotOfferedError round-trips through the command's error channel", () => {
    roundTrip(AppRpcs.setTrainingFocus.error, {
      _tag: "TrainingFocusNotOfferedError",
      playerId: "p1",
      focus: "goalkeeping",
    });
  });

  it("rejects the error without a Category, since None is always allowed", () => {
    expect(() =>
      Schema.decodeUnknownSync(AppRpcs.setTrainingFocus.error)({
        _tag: "TrainingFocusNotOfferedError",
        playerId: "p1",
        focus: null,
      }),
    ).toThrow();
  });
});
