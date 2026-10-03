import { EMPTY_BOTTOM_BAR, ShellBottomBar } from "../../src/renderer/chrome/bottom-bar/index.js";
import { useRegisteredScreenBottomBarActions } from "../../src/renderer/chrome/bottom-bar/screen-bottom-bar-actions.js";

/**
 * The bottom bar holding only what the mounted screen registered — for a test
 * that renders one screen without the career shell. A screen's verbs (Save
 * Tactic, …) live in the shell's bar, so a bare mount would otherwise lose them.
 */
export const RegisteredScreenBar = () => {
  const actions = useRegisteredScreenBottomBarActions();
  return (
    <ShellBottomBar
      plan={{ ...EMPTY_BOTTOM_BAR, secondary: actions?.buttons ?? [], reason: actions?.reason ?? null }}
    />
  );
};
