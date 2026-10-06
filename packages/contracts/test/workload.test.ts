import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { LastInjurySeveritySchema, RecoveryIndicatorSchema, WorkloadPlayerView, WorkloadView } from "../src/schemas/index.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

const player = (overrides: Record<string, unknown> = {}) => ({
  id: "p1",
  firstName: "Ana",
  lastName: "Reis",
  condition: 74,
  lastInjurySeverity: "none",
  recovery: "rest",
  ...overrides,
});

describe("Workload and Recovery view (Screen 112)", () => {
  it.each(["none", "light", "medium", "severe"] as const)(
    "WorkloadPlayerView round-trips a player whose last injury Severity is %s",
    (severity) => {
      roundTrip(WorkloadPlayerView, player({ lastInjurySeverity: severity }));
    },
  );

  it.each(["rest", "active"] as const)("WorkloadPlayerView round-trips recovery indicator %s", (recovery) => {
    roundTrip(WorkloadPlayerView, player({ recovery }));
  });

  it("rejects a recovery indicator outside Rest/Active, or a missing one", () => {
    expect(() => Schema.decodeUnknownSync(RecoveryIndicatorSchema)("tired")).toThrow();
    expect(() => Schema.decodeUnknownSync(WorkloadPlayerView)(player({ recovery: undefined }))).toThrow();
  });

  it.each([0, 74, 75, 100])("WorkloadPlayerView round-trips Condition %d", (condition) => {
    roundTrip(WorkloadPlayerView, player({ condition }));
  });

  it("rejects a Severity the fitness ledger does not admit", () => {
    expect(() => Schema.decodeUnknownSync(LastInjurySeveritySchema)("critical")).toThrow();
    expect(() => Schema.decodeUnknownSync(WorkloadPlayerView)(player({ lastInjurySeverity: null }))).toThrow();
  });

  it("rejects a non-finite or missing Condition", () => {
    expect(() => Schema.decodeUnknownSync(WorkloadPlayerView)(player({ condition: Number.NaN }))).toThrow();
    expect(() => Schema.decodeUnknownSync(WorkloadPlayerView)(player({ condition: "74" }))).toThrow();
    expect(() => Schema.decodeUnknownSync(WorkloadPlayerView)(player({ condition: undefined }))).toThrow();
  });

  it("WorkloadView round-trips a list of players and an empty list", () => {
    roundTrip(WorkloadView, {
      players: [player(), player({ id: "p2", firstName: "Rui", lastName: "Costa", condition: 100, recovery: "active" })],
    });
    roundTrip(WorkloadView, { players: [] });
  });

  it("is the getWorkload success schema", () => {
    expect(AppRpcs.getWorkload.success).toBe(WorkloadView);
  });

  it("getWorkload payload round-trips a saveId", () => {
    roundTrip(AppRpcs.getWorkload.payload, { saveId: "s1" });
  });

  it("getWorkload error schema round-trips SaveNotFoundError", () => {
    roundTrip(AppRpcs.getWorkload.error, { _tag: "SaveNotFoundError", id: "s1" });
  });
});
