import { Schema } from "effect";
import { SIMULATION_DEPTHS } from "@cm-clone/shared";

export const SimulationDepthSchema = Schema.Literals(SIMULATION_DEPTHS);

/**
 * One depth band of the generated competition graph: how many Competitions the selected scope
 * produced at this Simulation Depth, and how many clubs sit in them.
 *
 * Grouped by depth rather than listed per competition because the Review step is confirming a
 * scope, not browsing a pyramid — the player already chose the leagues by name one step back, and
 * what they cannot see anywhere else is how much world those choices turned into. Bands with no
 * competitions are absent rather than present with a zero.
 */
export class CareerSetupCompetitionBand extends Schema.Class<CareerSetupCompetitionBand>(
  "CareerSetupCompetitionBand",
)({
  depth: SimulationDepthSchema,
  competitionCount: Schema.Finite,
  clubCount: Schema.Finite,
}) {}

/**
 * §22's Career Setup Summary: what the provisional world on disk actually contains, read at the
 * Review step so the player commits a career rather than a set of answers.
 *
 * Every figure is counted from the generated save, never from the pre-generation estimate the
 * League step showed — that is the whole point of reading it here. Purely descriptive: nothing in
 * this view is an input to anything, and the panel that renders it offers no way to change it.
 *
 * `staffCount` is expected to be zero on a provisional world and is reported anyway rather than
 * omitted. A club's backroom is materialised at `commitCareer`, when the club becomes
 * human-managed (see `career/staff.ts`), so before the commit the honest count *is* zero; the
 * panel says so in words rather than printing a bare `0`. Reading it from disk means the figure
 * starts telling the truth by itself if staff generation ever moves earlier.
 */
export class CareerSetupSummaryView extends Schema.Class<CareerSetupSummaryView>(
  "CareerSetupSummaryView",
)({
  /** Always 1 for a provisional world — carried explicitly so the label never has to assume it. */
  seasonNumber: Schema.Finite,
  /** The season the career opens in, as the two years it spans: `2026/27`. */
  seasonLabel: Schema.String,
  /** ISO `YYYY-MM-DD`: the pre-season date the career starts on. */
  seasonStartDate: Schema.String,
  /** Nations with at least one generated Competition — not the `nations` catalogue table, which
   *  carries every nation in the ruleset whatever the selection resolved to. */
  nationCount: Schema.Finite,
  /** Ordered deepest-first (`full`, `standard`, `results-only`), bands with no rows omitted. */
  competitions: Schema.Array(CareerSetupCompetitionBand),
  clubCount: Schema.Finite,
  playerCount: Schema.Finite,
  staffCount: Schema.Finite,
}) {}
