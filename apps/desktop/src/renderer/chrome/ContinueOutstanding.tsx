/**
 * What is outstanding before Continue, and where to go and fix it.
 *
 * Distinct from the [Continue result band](./ContinueResult.tsx) beside it, and the difference is
 * the whole reason both exist. The result band reports one press and is dismissed. This one is a
 * *derived state*: it is on screen for exactly as long as its conditions hold, and it carries no
 * dismiss control, because dismissing it would not resolve anything — the classic failure of a
 * reminder that can be acknowledged while the thing it names stays undone.
 *
 * The chrome used to render the first advisory as one line of prose in the header band. A player
 * with unanswered bids *and* no Tactic heard about one of them, fixed it, and discovered the second.
 * Every item is listed here, blockers before advisories, each with the screen that owns its fix —
 * and the destination comes from the item, so nothing here reads copy to decide where to send
 * anyone.
 *
 * An advisory stays ignorable. Nothing in this band blocks the advance that is not already blocked
 * by the readiness rules themselves; letting a bid lapse is a legitimate answer.
 */
import {
  CONTINUE_DESTINATION_LABELS,
  type ContinueDestination,
  type ReadinessItem,
} from "@cm-clone/shared";
import { FOCUS_RING } from "../focus.js";
import { PANEL } from "../theme.js";


const OutstandingRow = ({
  item,
  onOpen,
}: {
  readonly item: ReadinessItem;
  readonly onOpen: (destination: ContinueDestination) => void;
}) => {
  const { destination } = item;
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span>
        <span
          className={
            item.severity === "blocking"
              ? "font-semibold text-text-danger"
              : "font-semibold text-text-primary"
          }
        >
          {item.title}.
        </span>{" "}
        <span className="text-text-secondary">{item.detail}</span>
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

export const ContinueOutstandingBand = ({
  items,
  onOpen,
}: {
  readonly items: readonly ReadinessItem[];
  readonly onOpen: (destination: ContinueDestination) => void;
}) => {
  if (items.length === 0) return null;

  return (
    <section aria-label="Outstanding before you continue" className={`${PANEL} mx-2 mt-2`}>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <OutstandingRow key={item.id} item={item} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
};
