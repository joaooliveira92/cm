/**
 * The shell's bottom bar: two zones, rendered from a `BottomBarPlan` and
 * nothing else, styled to match the shell header (see `ShellHeader`).
 */
import { Button } from "../../components/ui/button.js";
import type { BottomBarButton, BottomBarPlan } from "./shell-bottom-bar-state.js";

export interface ShellBottomBarProps {
  readonly plan: BottomBarPlan;
  /** The bar is the shell's, so it spans the shell; a screen rendering one
   *  inline (outside a shell) passes its own class instead. */
  readonly className?: string;
}

export const ShellBottomBar = ({ plan, className }: ShellBottomBarProps) => (
  <footer
    className={
      className ??
      "flex h-11 w-full shrink-0 items-center border-t border-border-subtle bg-bg-raised px-4"
    }
  >
    <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
      {/* Leading: leaving the flow, then stepping back. Cancel keeps its place
          across every step, which is what makes it findable without reading. */}
      <div className="flex items-center gap-3">
        {plan.cancel !== null && <BarButton button={plan.cancel} variant="outline" />}
        {plan.back !== null && <BarButton button={plan.back} variant="outline" />}
      </div>

      {/* Trailing: supporting verbs, then the step's one forward verb. */}
      <div className="flex items-center gap-3">
        {plan.secondary.map((button) => (
          <BarButton key={button.id} button={button} variant="outline" />
        ))}
        {plan.primary !== null && <BarButton button={plan.primary} />}
      </div>
    </div>
  </footer>
);

const BarButton = ({
  button,
  variant,
}: {
  readonly button: BottomBarButton;
  readonly variant?: "outline";
}) => (
  <Button
    type="button"
    variant={variant}
    data-bottom-bar-action={button.id}
    disabled={button.disabled}
    onClick={button.onTrigger}
  >
    {button.label}
  </Button>
);
