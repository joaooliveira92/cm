import type { CareerSetupCompetitionBand } from "@cm-clone/contracts";
import type { SimulationDepth } from "@cm-clone/shared";

/**
 * The Review step's reading of §22's Career Setup Summary: how the counted world is put into
 * words. Pure, and separate from the panel, because the sentences are the part with rules in them
 * — pluralisation, an absent depth band, a staff figure that is honestly zero — and each of those
 * is worth an assertion that does not need a render.
 */

/** The same vocabulary the Active Leagues grid uses for a Competition's Simulation Depth. */
const DEPTH_LABELS: Readonly<Record<SimulationDepth, string>> = {
  full: "Full",
  standard: "Standard",
  "results-only": "Results only",
};

const plural = (count: number, noun: string): string =>
  `${count.toLocaleString()} ${noun}${count === 1 ? "" : "s"}`;

/**
 * The competition line: one clause per depth band the world actually has, deepest first. The
 * server omits empty bands, so a scope with no background football says nothing about background
 * football rather than claiming zero of it.
 */
export const describeCompetitions = (
  bands: readonly CareerSetupCompetitionBand[],
): string =>
  bands.length === 0
    ? "None"
    : bands
      .map(
        (band) =>
          `${plural(band.competitionCount, "competition")} at ${DEPTH_LABELS[band.depth]} depth (${plural(band.clubCount, "club")})`,
      )
      .join(", ");

/**
 * The staff line.
 *
 * A provisional world has no staff, and the zero is not a defect: a club's backroom is
 * materialised when the club becomes human-managed, which happens at the commit this very panel is
 * confirming. Printing a bare `0` would read as a world that failed to generate people, so the
 * zero case says what is true instead. The non-zero branch is not dead — it is what this line
 * reports the moment staff generation moves anywhere earlier.
 */
export const describeStaff = (staffCount: number): string =>
  staffCount === 0
    ? "Appointed when the career is created"
    : staffCount.toLocaleString();
