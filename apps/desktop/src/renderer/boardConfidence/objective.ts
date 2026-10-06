import { type BoardObjectiveView } from "@cm-clone/contracts";

/** The board's verdicts in the board's words, keyed as the schema carries them. */
const VERDICT_WORDS: Readonly<Record<string, string>> = {
  exceeded: "Exceeded",
  met: "Met",
  missed: "Missed",
};

/** A verdict's word, falling back to the schema value so a drift cannot render a hole. */
export const verdictWord = (verdict: string): string => VERDICT_WORDS[verdict] ?? verdict;

/**
 * How the season reads against a set objective: where the club finished (or that the season is
 * still being played) and, once judged, the verdict. `null` on `finalPosition` or `verdict` is not
 * a withheld state — it is a season still being played, the ordinary state for most of a career.
 */
export const objectiveSummary = (objective: BoardObjectiveView): string => {
  const position =
    objective.finalPosition === null
      ? "The season is still being played."
      : `Finished ${objective.finalPosition}.`;
  const verdict =
    objective.verdict === null ? "No verdict yet." : `Verdict: ${verdictWord(objective.verdict)}.`;
  return `${position} ${verdict}`;
};