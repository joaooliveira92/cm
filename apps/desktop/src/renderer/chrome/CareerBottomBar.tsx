/**
 * The career shell's bottom bar: the creation flow's `ShellBottomBar`, carried
 * into the career. Continue holds the primary zone, the registered screen's
 * verbs sit beside it, and the version line scrolls in the middle.
 */
import { dispatchAction } from "../actions/dispatch.js";
import { APP_VERSION, DATABASE_EDITION } from "../appInfo.js";
import { describeCareerBottomBar, ShellBottomBar } from "./bottom-bar/index.js";
import { useRegisteredScreenBottomBarActions } from "./bottom-bar/screen-bottom-bar-actions.js";
import { continueUnavailableReason, useCareerState } from "./CareerStateProvider.js";

const STATUS = [`Version ${APP_VERSION}`, `Database: ${DATABASE_EDITION} · Mods: none`];

export const CareerBottomBar = ({ matchInProgress }: { readonly matchInProgress: boolean }) => {
  const { continueDisabled, advancing, continueLabel } = useCareerState();
  const screen = useRegisteredScreenBottomBarActions();

  const plan = describeCareerBottomBar({
    continueLabel,
    continueDisabled,
    advancing,
    continueUnavailableReason: continueUnavailableReason() ?? null,
    matchInProgress,
    screen,
    status: STATUS,
    onContinue: () => void dispatchAction("continue"),
  });

  return <ShellBottomBar plan={plan} />;
};
