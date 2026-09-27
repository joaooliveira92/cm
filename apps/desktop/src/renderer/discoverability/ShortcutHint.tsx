import { useSyncExternalStore, type ReactNode } from "react";
import { Kbd } from "../components/ui/kbd.js";
import { getScopeState, subscribeScopeState } from "../actions/scopeState.js";

export const ShortcutHint = ({
  hintKey,
  className = "relative inline-flex shrink-0",
  children,
}: {
  readonly hintKey?: string | undefined;
  /** The wrapper's layout. Overridden by the sidebar, whose rows are full-width blocks
   *  rather than the inline controls the horizontal navbar wrapped. */
  readonly className?: string;
  readonly children: ReactNode;
}) => {
  const scope = useSyncExternalStore(subscribeScopeState, getScopeState, getScopeState);
  const show = hintKey !== undefined && scope.prefixActive === true;

  return (
    <div className={className}>
      {children}
      {show && (
        <Kbd
          aria-hidden
          data-shortcut-hint={hintKey}
          className="absolute -top-1.5 -left-1.5 z-10 border-header-fg/50 bg-header-bg text-header-fg shadow-md"
        >
          {hintKey}
        </Kbd>
      )}
    </div>
  );
};