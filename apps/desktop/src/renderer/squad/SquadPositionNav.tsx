/**
 * The Squad screen's bottom position nav: a row of toggle buttons, one per
 * pitch position (`POSITIONS`), that drive the same single-position filter the
 * toolbar's Position select does. Rendered as a persistent bottom bar so a
 * manager can filter the squad by position without hunting through the toolbar.
 *
 * Selection is the screen's position filter, not local component state: the
 * `pressed` bit on each `Toggle` mirrors the active `position` clause, and
 * pressing the selected position clears the filter (back to "All positions"),
 * exactly as the toolbar's select does.
 */
import { POSITIONS, type Position } from "@cm-clone/shared";
import { Toggle } from "../components/ui/toggle.js";
import { FOCUS_RING } from "../focus.js";
import { useSquad } from "./SquadProvider.js";
import type { FilterClause } from "../table/types.js";

/** The position button's pressed treatment: the argument a highlighted code
 *  reads against the bar — the natural extension of the position list, where a
 *  Natural position is the eye's landing spot (see `FAMILIARITY_TONE`). */
const PRESSED_CLASS = "border-text-highlight bg-text-highlight/15 text-text-highlight";
const IDLE_CLASS = "border-border-subtle text-text-secondary hover:bg-surface-raised";

/** The active position filter clause, if any. Single-select, so at most one. */
const activePositionClause = (
  filters: readonly FilterClause[],
): Extract<FilterClause, { readonly _tag: "position" }> | undefined =>
  filters.find(
    (f): f is Extract<FilterClause, { readonly _tag: "position" }> => f._tag === "position",
  );

const PositionButton = ({
  position,
  pressed,
  onChanged,
}: {
  readonly position: Position;
  readonly pressed: boolean;
  readonly onChanged: (pressed: boolean) => void;
}) => (
  <Toggle
    pressed={pressed}
    onPressedChange={onChanged}
    aria-label={`Filter the squad by ${position}`}
    className={`border rounded-control px-2 py-1 font-mono text-xs transition-colors ${
      pressed ? PRESSED_CLASS : IDLE_CLASS
    } ${FOCUS_RING.join(" ")}`}
  >
    {position}
  </Toggle>
);

/** The bottom position nav. Sticky to the foot of the career shell's scroll
 *  region, so it is always within reach of the list it filters. */
export const SquadPositionNav = () => {
  const { state, actions } = useSquad();
  const { filters } = state;
  const { setPositionFilter } = actions;

  const active = activePositionClause(filters);

  return (
    <footer
      aria-label="Filter squad by position"
      className="sticky bottom-0 z-10 mt-4 border-t border-border-subtle bg-bg-raised px-4 py-2"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {POSITIONS.map((position) => (
          <PositionButton
            key={position}
            position={position}
            pressed={active?.position === position}
            onChanged={(pressed) => setPositionFilter(pressed ? position : "")}
          />
        ))}
      </div>
    </footer>
  );
};
