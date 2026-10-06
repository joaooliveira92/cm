import type { Category } from "@cm-clone/shared";
import { Button } from "../components/ui/button.js";
import { trainingFocusLabel, type TrainingFocusValue } from "./trainingFocusOptions.js";

/**
 * The Training Focus picker: None plus each offered Category as a toggle button, with the player's
 * current Training Focus pressed.
 *
 * Props-only. It holds no state and sends nothing: the caller passes the current value it read and
 * receives the choice through `onSelect`, so the pressed button always reflects the read, never a
 * guess. Choosing the value already pressed does not call `onSelect`.
 *
 * A current Category the player is not offered (a Goalkeeping focus set on an outfield player
 * before the rule was applied) still shows, pressed and disabled, so the picker never reads as
 * having no Training Focus. Choosing any offered value replaces it.
 */
export const TrainingFocusPicker = ({
  playerName,
  current,
  offered,
  disabled = false,
  onSelect,
}: {
  readonly playerName: string;
  readonly current: TrainingFocusValue;
  readonly offered: ReadonlyArray<Category>;
  readonly disabled?: boolean;
  readonly onSelect: (focus: TrainingFocusValue) => void;
}) => {
  const offRule = current !== null && !offered.includes(current);
  const options: ReadonlyArray<TrainingFocusValue> = offRule
    ? [null, ...offered, current]
    : [null, ...offered];
  return (
    <div role="group" aria-label={`${playerName} Training Focus`} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const pressed = option === current;
        return (
          <Button
            key={option ?? "none"}
            type="button"
            variant={pressed ? "default" : "outline"}
            size="lg"
            aria-pressed={pressed}
            disabled={disabled || (offRule && option === current)}
            onClick={() => {
              if (!pressed) onSelect(option);
            }}
          >
            {trainingFocusLabel(option)}
          </Button>
        );
      })}
    </div>
  );
};
