import { useSyncExternalStore, type ReactNode } from "react";
import type { SaveId } from "@cm-clone/contracts";
import { canNavigateBack, navigateBack, navigateForward } from "../navigation/adapter.js";
import { CareerSidebar } from "../navigation/components/CareerSidebar.js";
import { NavProvider } from "../navigation/NavProvider.js";
import { Button } from "../components/ui/button.js";
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar.js";
import { FOCUS_RING } from "../focus.js";
import { Header } from "./header/index.js";
import { AppTitleBar } from "./header/AppTitleBar.js";
import { CareerIdentity } from "./header/CareerIdentity.js";
import { HeaderActionsMenu } from "./header/HeaderActionsMenu.js";
import { clubHeaderStyle } from "./header/club-scheme.js";
import { NO_DRAG } from "./header/drag-region.js";
import { CareerStateProvider, useCareerState, continueUnavailableReason } from "./CareerStateProvider.js";
import { ContinueAction } from "./ContinueAction.js";
import { ContinueOutstandingBand } from "./ContinueOutstanding.js";
import { ContinueResultBand } from "./ContinueResult.js";
import {
  matchReadout,
  seasonReadout,
  type SeasonReadoutInput,
} from "./header/career-header-state.js";
import { ScreenToolbarSlot } from "./ScreenToolbarSlot.js";
import { getScreenIdentity, subscribeScreenIdentity } from "../screenIdentity.js";

export { NAV_SECTIONS as CAREER_SECTIONS } from "../navigation/nav-config.js";
export { matchReadout, seasonReadout, type SeasonReadoutInput, continueUnavailableReason };

/**
 * The career shell: a full-width header band, the primary-navigation sidebar
 * beneath it, and the screen in the remaining column.
 *
 * The header spans the whole window rather than starting after the sidebar,
 * because it is the window's drag handle (`titleBarStyle: "hiddenInset"` leaves
 * macOS with no other one) and because the club identity belongs to the save, not
 * to the navigation. `--header-height` names the band's own height in one place,
 * covering both its rows — the title band and the season readout under it. The
 * sidebar needs no offset against it: it is the next flex row down.
 *
 * Everything the screen owns — the toolbar, the career-loop bands, the screen
 * itself — sits inside the content column, so it scrolls and resizes with the
 * screen instead of pushing the whole shell down.
 */
const CareerChromeInner = ({
  saveId,
  contextNav,
  children,
}: {
  readonly saveId: SaveId;
  readonly contextNav?: ReactNode;
  readonly children: ReactNode;
}) => {
  const {
    clubName, clubColours, badgeKey, newsCounts, career, outstanding, screenId,
    report, setReport, openDestination, acknowledgeReadinessItem, onBackToSaves,
  } = useCareerState();

  const identity = useSyncExternalStore(subscribeScreenIdentity, getScreenIdentity, getScreenIdentity);

  // Don't show outstanding items whose destination is the current screen —
  // the player is already where the fix lives.
  const filteredOutstanding = outstanding.filter(
    (item) =>
      item.destination === null ||
      screenId === null ||
      item.destination !== screenId,
  );

  const badges =
    newsCounts === null || newsCounts.unread === 0
      ? undefined
      : {
        news: {
          count: newsCounts.unread,
          label: newsCounts.actionRequired > 0 ? "unread, some awaiting an answer" : "unread",
        },
      };

  return (
    <NavProvider saveId={saveId}>
      <div className="h-screen overflow-hidden bg-background [--header-height:calc(--spacing(18))]">
        <SidebarProvider className="flex h-full flex-col">
          <header
            className="club-header flex h-(--header-height) w-full shrink-0 flex-col text-header-fg"
            style={clubHeaderStyle(clubColours)}
          >
            <AppTitleBar
              title={identity?.name ?? clubName ?? ""}
              leading={
                <span className="flex items-center gap-2">
                  <SidebarTrigger className="text-header-fg hover:bg-header-fg/10" />
                  <Header.Nav
                    back={{ disabled: !canNavigateBack(), onTrigger: navigateBack }}
                    forward={{ disabled: false, onTrigger: navigateForward }}
                  />
                </span>
              }
              identity={
                <CareerIdentity
                  clubName={clubName}
                  clubColours={clubColours}
                  badgeKey={badgeKey ?? null}
                  identity={identity}
                />
              }
              actions={
                <>
                  <Header.Search />
                  <Button
                    variant="secondary"
                    className={`rounded-control border border-border-subtle px-3 py-1 text-text-secondary hover:text-text-primary ${FOCUS_RING.join(" ")}`}
                    onClick={(event) => onBackToSaves(event.detail > 0 ? "pointer" : "keyboard")}
                  >
                    Back to saves
                  </Button>
                  <ContinueAction />
                </>
              }
            />
            <div
              className="flex h-7 w-full items-center border-b border-header-border bg-header-bg px-3"
              style={NO_DRAG}
            >
              <Header.SecondaryRow
                state={{ view: "career", career, player: identity?.player ?? null }}
              />
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <CareerSidebar badges={badges} />

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {contextNav}
              <div
                className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-bg px-3 py-1"
                style={NO_DRAG}
              >
                <span className="flex items-center gap-2">
                  <ScreenToolbarSlot />
                  <HeaderActionsMenu />
                </span>
                <div className="flex-1" />
              </div>
              <ContinueOutstandingBand
                items={filteredOutstanding}
                onOpen={openDestination}
                onDismiss={acknowledgeReadinessItem}
              />
              {report !== null && (
                <ContinueResultBand
                  report={report}
                  onOpen={openDestination}
                  onDismiss={() => setReport(null)}
                />
              )}
              {children}
            </div>
          </div>
        </SidebarProvider>
      </div>
    </NavProvider>
  );
};

export const CareerChrome = ({
  saveId,
  contextNav,
  children,
}: {
  readonly saveId: SaveId;
  /** The contextual tab row, for the routes that have one (a match, an entity profile). */
  readonly contextNav?: ReactNode;
  readonly children: ReactNode;
}) => (
  <CareerStateProvider saveId={saveId}>
    <CareerChromeInner saveId={saveId} contextNav={contextNav}>
      {children}
    </CareerChromeInner>
  </CareerStateProvider>
);
