import { Schema } from "effect";
import { TRAINING_SCHEDULE_TEMPLATES } from "@cm-clone/shared";
import { describe, expect, it } from "vitest";
import {
  ChangeTrainingSchedulePayload,
  TrainingScheduleSetEvent,
  TrainingScheduleView,
} from "../src/index.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  expect(Schema.encodeSync(schema)(decoded)).toEqual(wire);
};

const sessions = TRAINING_SCHEDULE_TEMPLATES.balanced.map((s) => ({ type: s.type, intensity: s.intensity }));

describe("the training schedule wire", () => {
  it("round-trips the screen view, with and without a next Fixture", () => {
    const fixture = { fixtureId: 7, date: "2026-10-17", opponentClubName: "Eastfield", isHome: true };
    const who = { delegated: false, assistantName: "Ana Sousa", assistantReason: null };
    roundTrip(TrainingScheduleView, { sessions, template: "balanced", revision: 3, nextFixture: fixture, ...who });
    roundTrip(TrainingScheduleView, { sessions, template: null, revision: 0, nextFixture: null, ...who });
    roundTrip(TrainingScheduleView, {
      sessions, template: "recovery", revision: 2, nextFixture: null,
      delegated: true, assistantName: "Ana Sousa", assistantReason: "the squad is tired",
    });
  });

  it("round-trips the write payload and the event", () => {
    roundTrip(ChangeTrainingSchedulePayload, { saveId: "s1", sessions, expectedRevision: 0, requestId: "r1" });
    roundTrip(TrainingScheduleSetEvent, { seasonNumber: 1, author: "manager", sessions, template: "balanced" });
    roundTrip(TrainingScheduleSetEvent, {
      seasonNumber: 1, author: "assistant", sessions, template: "recovery",
      assistantName: "Ana Sousa", reason: "the squad is tired", opponentClubName: "Eastfield",
    });
  });

  it("refuses a session outside the closed set at decode", () => {
    const bad = [{ type: "yoga", intensity: "low" }, ...sessions.slice(1)];
    expect(() =>
      Schema.decodeUnknownSync(ChangeTrainingSchedulePayload)({
        saveId: "s1",
        sessions: bad,
        expectedRevision: 0,
        requestId: "r1",
      }),
    ).toThrow();
  });
});
