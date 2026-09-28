/**
 * The career shell's bottom bar: the creation flow's `ShellBottomBar`, carried
 * into the career. Continue holds the primary zone, the registered screen's
 * verbs sit beside it, and the marquee in the middle scrolls what is outstanding
 * before Continue, then the version line.
 *
 * The outstanding items are a derived state: each is in the marquee for exactly
 * as long as its condition holds, blockers before advisories, and each carries
 * the screen that owns its fix, so nothing here reads copy to decide where to
 * send anyone. Every item is listed rather than the first, because a player with
 * unanswered bids *and* no Tactic who hears about one fixes it and is then
 * surprised by the other.
 */
import { CONTINUE_DESTINATION_LABELS, type ReadinessItem } from "@cm-clone/shared";
import { dispatchAction } from "../actions/dispatch.js";
import { APP_VERSION, DATABASE_EDITION } from "../appInfo.js";
import { describeCareerBottomBar, ShellBottomBar, type StatusNotice } from "./bottom-bar/index.js";
import { useRegisteredScreenBottomBarActions } from "./bottom-bar/screen-bottom-bar-actions.js";
import { continueUnavailableReason, useCareerState } from "./CareerStateProvider.js";

const VERSION_STATUS = [`Version ${APP_VERSION}`, `Database: ${DATABASE_EDITION} · Mods: none`];

export const CareerBottomBar = ({ matchInProgress }: { readonly matchInProgress: boolean }) => {
  const {
    continueDisabled, advancing, continueLabel, outstanding, screenId, openDestination,
    acknowledgeReadinessItem,
  } = useCareerState();
  const screen = useRegisteredScreenBottomBarActions();

  const notices = outstanding
    // An item whose fix lives on the current screen is not repeated there: the
    // player is already where it points.
    .filter((item) => item.destination === null || screenId === null || item.destination !== screenId)
    .map((item): StatusNotice => toNotice(item, (destination) => {
      acknowledgeReadinessItem(item.id);
      openDestination(destination);
    }));

  const plan = describeCareerBottomBar({
    continueLabel,
    continueDisabled,
    advancing,
    continueUnavailableReason: continueUnavailableReason() ?? null,
    matchInProgress,
    screen,
    status: [...notices, ...VERSION_STATUS],
    onContinue: () => void dispatchAction("continue"),
  });

  return <ShellBottomBar plan={plan} />;
};

function toNotice(
  item: ReadinessItem,
  open: (destination: NonNullable<ReadinessItem["destination"]>) => void,
): StatusNotice {
  const { destination } = item;
  return {
    title: item.title,
    detail: item.detail,
    tone: item.severity === "blocking" ? "danger" : "default",
    open:
      destination === null
        ? null
        : { label: CONTINUE_DESTINATION_LABELS[destination], onOpen: () => open(destination) },
  };
}
