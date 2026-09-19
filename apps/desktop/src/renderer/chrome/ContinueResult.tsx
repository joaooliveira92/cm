/**
 * What the last press of Continue did, stated once and left on screen.
 *
 * The career loop is inspect → decide → Continue → *read the consequence* → inspect again, and the
 * fourth step had no surface: the advance's result crossed the process boundary and was discarded,
 * so the season readout moved and the player was left to infer why. A failed advance was worse —
 * outside the League table's own control, which is now gone, nothing reported it at all.
 *
 * This is a band, not a toast and not a dialog. It has to survive long enough to be read and acted
 * on, and it must not seize focus: the player pressed Continue to keep playing, and an overlay
 * demanding dismissal every Matchday is the fastest way to make the primary verb feel expensive.
 *
 * **It is not an inbox and must not grow into one.** No persistence, no read state, no history, no
 * pagination. It shows the most recent advance and nothing else; after it is dismissed the durable
 * consequences stay visible on the screens that own them.
 */
import {
  CONTINUE_DESTINATION_LABELS,
  type ContinueConsequence,
  type ContinueDestination,
  type ContinueOutcome,
} from "@cm-clone/shared";
import { FOCUS_RING } from "../focus.js";
import { BTN_SECONDARY, PANEL } from "../theme.js";

/** What the band is reporting: the account of an advance, or why one failed. */
export type ContinueReport =
  | { readonly kind: "outcome"; readonly outcome: ContinueOutcome }
  | { readonly kind: "failure"; readonly message: string };


const ConsequenceRow = ({
  consequence,
  headlined,
  onOpen,
}: {
  readonly consequence: ContinueConsequence;
  /** True for the consequence whose title is already the band's heading: it
   *  still needs its detail and its route, but restating the title beneath
   *  itself reads as a repetition rather than as the first of several. */
  readonly headlined: boolean;
  readonly onOpen: (destination: ContinueDestination) => void;
}) => {
  const { destination } = consequence;
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span>
        {!headlined && (
          <span className="font-semibold text-text-primary">{consequence.title}. </span>
        )}
        <span className="text-text-secondary">{consequence.detail}</span>
      </span>
      {destination !== null && (
        <button
          type="button"
          className={`shrink-0 text-sm underline underline-offset-2 hover:text-text-primary ${FOCUS_RING.join(" ")}`}
          onClick={() => onOpen(destination)}
        >
          {CONTINUE_DESTINATION_LABELS[destination]}
        </button>
      )}
    </li>
  );
};

export const ContinueResultBand = ({
  report,
  onOpen,
  onDismiss,
}: {
  readonly report: ContinueReport;
  readonly onOpen: (destination: ContinueDestination) => void;
  readonly onDismiss: () => void;
}) => {
  const headline = report.kind === "outcome" ? report.outcome.headline : report.message;

  return (
    <section
      aria-label="What Continue did"
      className={`${PANEL} m-2 ${report.kind === "failure" ? "border-destructive" : ""}`}
    >
      {/* The announcement is the headline alone. Reading the whole band aloud would
          announce every consequence and both controls on every advance; the reason
          Continue stopped is the sentence that has to arrive without looking. */}
      <p className="sr-only" role="status">
        {headline}
      </p>

      <div className="flex items-baseline justify-between gap-3">
        <h2
          className={`text-sm font-semibold ${report.kind === "failure" ? "text-text-danger" : "text-text-primary"}`}
        >
          {headline}
        </h2>
        <button
          type="button"
          className={`${BTN_SECONDARY} shrink-0 text-sm ${FOCUS_RING.join(" ")}`}
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>

      {report.kind === "outcome" && report.outcome.consequences.length > 0 && (
        // Every consequence the advance reported, in the order the career-loop
        // note fixes. Priority decides what speaks first; it never decides what
        // is dropped, so a lower-priority window transition is still here under
        // a sacking.
        <ul className="mt-1 space-y-1 text-sm">
          {report.outcome.consequences.map((consequence, index) => (
            <ConsequenceRow
              key={consequence.id}
              consequence={consequence}
              headlined={index === 0}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
    </section>
  );
};
