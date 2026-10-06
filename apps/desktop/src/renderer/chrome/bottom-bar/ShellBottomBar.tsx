/**
 * The shell's bottom bar: leading, one reason, trailing — rendered from a
 * `BottomBarPlan` and nothing else, styled to match the shell header (see
 * `ShellHeader`).
 */
import { useId } from "react";
import { Button } from "../../components/ui/button.js";
import type { BottomBarButton, BottomBarPlan } from "./shell-bottom-bar-state.js";
import { StatusMarquee } from "./StatusMarquee.js";

export interface ShellBottomBarProps {
  readonly plan: BottomBarPlan;
  /** The bar is the shell's, so it spans the shell; a screen rendering one
   *  inline (outside a shell) passes its own class instead. */
  readonly className?: string;
}

export const ShellBottomBar = ({ plan, className }: ShellBottomBarProps) => {
  const reasonId = useId();
  // The reason is the disabled primary's description, not just its neighbour: a
  // screen reader never lands on a disabled button's `title`, but it does read
  // `aria-describedby`.
  const primaryDescribedBy =
    plan.primary?.disabled === true && plan.reason !== null ? reasonId : undefined;

  return (
    <footer
      className={
        className ??
        "flex h-11 w-full shrink-0 items-center border-t border-border-subtle bg-bg-raised/70 px-3 backdrop-blur-md"
      }
    >
      {/* The row spans the bar rather than a centred reading column: the bar is a
          shell surface like the header band above it, so its controls belong at the
          window's margins, aligned with that band's, not floating in the middle of
          a wide window. */}
      <div className="flex w-full items-center gap-3">
        {/* Leading: leaving the flow, then stepping back. Cancel keeps its place
            across every step, which is what makes it findable without reading. */}
        <div className="flex shrink-0 items-center gap-2">
          {plan.cancel !== null && <BarButton button={plan.cancel} variant="outline" />}
          {plan.back !== null && <BarButton button={plan.back} variant="outline" />}
        </div>
  
        {/* Why the forward verb cannot be pressed. It sits in the bar's own row, on
            the left, vertically centred, and the row is always in the layout — only
            its text comes and goes — so the bar is the same height on every screen
            and in every state, and a greyed control always says why. `title` is not
            a substitute for the text: a disabled button never delivers one. */}
        <p
          id={reasonId}
          aria-live="polite"
          title={plan.reason ?? undefined}
          className={`min-w-0 truncate text-body text-text-secondary ${plan.status.length > 0 ? "" : "flex-1"}`}
        >
          {plan.reason ?? ""}
        </p>
  
        {plan.status.length > 0 && <StatusMarquee items={plan.status} />}
  
        {/* Trailing: supporting verbs, then the step's one forward verb. */}
        <div className="flex shrink-0 items-center gap-2">
          {plan.secondary.map((button) => (
            <BarButton key={button.id} button={button} variant="outline" />
          ))}
          {plan.primary !== null && (
            <BarButton button={plan.primary} describedBy={primaryDescribedBy} />
          )}
        </div>
      </div>
    </footer>
  );
};

const BarButton = ({
  button,
  variant,
  describedBy,
}: {
  readonly button: BottomBarButton;
  readonly variant?: "outline";
  readonly describedBy?: string | undefined;
}) => (
  <Button
    type="button"
    variant={variant}
    data-bottom-bar-action={button.id}
    data-action-id={button.actionId}
    disabled={button.disabled}
    aria-describedby={describedBy}
    onClick={button.onTrigger}
  >
    {button.label}
  </Button>
);
