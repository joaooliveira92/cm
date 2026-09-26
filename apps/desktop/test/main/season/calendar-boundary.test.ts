/**
 * The calendar state machine, pure: where `nextCalendarBoundary` stops, which transfer
 * windows it opens, and when it calls a season complete.
 *
 * No world is generated here — these run in milliseconds.
 */

import { it } from "@effect/vitest";
import { deepStrictEqual } from "node:assert";
import { Effect } from "effect";
import { nextCalendarBoundary } from "@cm-clone/shared";

const WINDOWS = { preSeasonOpen: "2026-07-04", midSeasonOpen: "2027-01-01", midSeasonClose: "2027-02-01" };

it.effect("nextCalendarBoundary stops at the next playable fixture date", () =>
  Effect.sync(() => {
    const boundary = nextCalendarBoundary({
      currentDate: "2026-07-04",
      nextPlayableDate: "2026-08-01",
      finalUnplayedDate: "2027-05-26",
      windows: WINDOWS,
    });
    deepStrictEqual(boundary, { type: "matchDate", date: "2026-08-01" });
  }),
);

it.effect("nextCalendarBoundary stops at the mid-season window's open before the fixture beyond it", () =>
  Effect.sync(() => {
    const boundary = nextCalendarBoundary({
      currentDate: "2026-12-19",
      nextPlayableDate: "2027-01-09",
      finalUnplayedDate: "2027-05-26",
      windows: WINDOWS,
    });
    deepStrictEqual(boundary, { type: "windowOpen", date: "2027-01-01" });
  }),
);

it.effect("nextCalendarBoundary does not reopen a window the calendar has already passed", () =>
  Effect.sync(() => {
    const boundary = nextCalendarBoundary({
      currentDate: "2027-01-09",
      nextPlayableDate: "2027-01-16",
      finalUnplayedDate: "2027-05-26",
      windows: WINDOWS,
    });
    deepStrictEqual(boundary, { type: "matchDate", date: "2027-01-16" });
  }),
);

it.effect("nextCalendarBoundary sweeps to the last dated fixture once the human has no football left", () =>
  Effect.sync(() => {
    // The human's league has finished, but a cup final or a background division has not. The
    // season ends at the last of them rather than at the human's last round.
    const boundary = nextCalendarBoundary({
      currentDate: "2027-05-26",
      nextPlayableDate: null,
      finalUnplayedDate: "2027-05-29",
      windows: WINDOWS,
    });
    deepStrictEqual(boundary, { type: "seasonEnd", date: "2027-05-29" });
  }),
);

it.effect("nextCalendarBoundary reports a season with nothing left unplayed as complete", () =>
  Effect.sync(() => {
    const boundary = nextCalendarBoundary({
      currentDate: "2027-05-29",
      nextPlayableDate: null,
      finalUnplayedDate: null,
      windows: WINDOWS,
    });
    deepStrictEqual(boundary, { type: "seasonComplete" });
  }),
);
