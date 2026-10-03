/**
 * Continue label derivation — what the career chrome's Continue button reads
 * from the game-loop state.
 *
 * The label changes based on what the Calendar has reached or what awaits the
 * manager. Pure and exported so it can be unit-tested without mounting the
 * chrome; the component is a renderer of this string.
 */

/** The subset of SeasonView the label derivation reads. */
export interface ContinueLabelSeason {
  readonly awaitingFixture: unknown;
}

export type ContinueLabelInput = {
  readonly season: ContinueLabelSeason | null;
  readonly continueDisabled: boolean;
  readonly actionRequired: number | null;
};

/** Derive the Continue button label from the game-loop state. */
export const deriveContinueLabel = (input: ContinueLabelInput): string => {
  if (input.season === null || input.continueDisabled) return "Continue";
  if (input.season.awaitingFixture !== null) return "Go to Match";
  if (input.actionRequired !== null && input.actionRequired > 0) return "Respond";
  return "Continue";
};