import { useSyncExternalStore, type ReactNode } from "react";
import { Kbd } from "../components/ui/kbd.js";
import { getScopeState, subscribeScopeState } from "../actions/scopeState.js";

export const ShortcutHint = ({
  hintKey,
  children,
}: {
  readonly hintKey?: string | undefined;
  readonly children: ReactNode;
}) => {
  const scope = useSyncExternalStore(subscribeScopeState, getScopeState, getScopeState);
  const show = hintKey !== undefined && scope.prefixActive === true;

  return (
    <div className="relative inline-flex shrink-0">
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