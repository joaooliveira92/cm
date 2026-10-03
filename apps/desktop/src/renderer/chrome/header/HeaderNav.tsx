/**
 * The history cluster. Both buttons are always rendered and merely disabled
 * when the step is unavailable, so the band's geometry never shifts under the
 * pointer as history grows — a control that appears and disappears is a control
 * you learn not to aim at.
 *
 * The actions are supplied by the caller rather than reached for here: this
 * component knows nothing about the router, which is what lets the band render
 * in tests and in the pre-career shells that have no history of their own.
 */
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "../../components/ui/button.js";
import { ButtonGroup } from "../../components/ui/button-group.js";

/** A header navigation control. The button is always visible, but may be disabled. */
export interface NavAction {
  readonly disabled: boolean;
  readonly onTrigger: () => void;
}

export interface HeaderNavProps {
  readonly back: NavAction;
  readonly forward: NavAction;
}

export const HeaderNav = ({ back, forward }: HeaderNavProps) => (
  <ButtonGroup>
    <Button
      variant="outline"
      size="icon"
      className="h-7 w-7"
      aria-label="Go back"
      onClick={back.onTrigger}
      disabled={back.disabled}
    >
      <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
    </Button>
    <Button
      variant="outline"
      size="icon"
      className="h-7 w-7"
      aria-label="Go forward"
      onClick={forward.onTrigger}
      disabled={forward.disabled}
    >
      <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
    </Button>
  </ButtonGroup>
);
