import type { SaveId } from "@cm-clone/contracts";
import type { ContinueDestination } from "@cm-clone/shared";
import { canNavigateBack, navigateBack, navigateForward } from "../navigation/adapter.js";
import { Navbar } from "../navigation/components/Navbar.js";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { Header } from "./header/index.js";
import { HeaderActionsMenu } from "./header/HeaderActionsMenu.js";
import { CareerStateProvider, useCareerState, continueUnavailableReason } from "./CareerStateProvider.js";
import { ContinueAction } from "./ContinueAction.js";
import { ContinueOutstandingBand } from "./ContinueOutstanding.js";
import { ContinueResultBand } from "./ContinueResult.js";
import {
  matchReadout,
  seasonReadout,
  type SeasonReadoutInput,
} from "./header/career-header-state.js";

export { NAV_SECTIONS as CAREER_SECTIONS } from "../navigation/nav-config.js";
export { matchReadout, seasonReadout, type SeasonReadoutInput, continueUnavailableReason };

const CareerChromeInner = ({ saveId }: { readonly saveId: SaveId }) => {
  const {
    clubName, clubColours, badgeKey, newsCounts, career, outstanding, screenId,
    report, setReport, openDestination, onBackToSaves,
  } = useCareerState();

  // Don't show outstanding items whose destination is the current screen —
  // the player is already where the fix lives.
  const filteredOutstanding = outstanding.filter(
    (item) =>
      item.destination === null ||
      screenId === null ||
      item.destination !== screenId,
  );

  return (
    <>
      <Navbar
        badges={
          newsCounts === null || newsCounts.unread === 0
            ? undefined
            : {
              news: {
                count: newsCounts.unread,
                label: newsCounts.actionRequired > 0 ? "unread, some awaiting an answer" : "unread",
              },
            }
        }
        saveId={saveId}
        clubName={clubName}
        clubColours={clubColours}
        badgeKey={badgeKey}
        leading={
          <Header.Nav
            back={{ disabled: !canNavigateBack(), onTrigger: navigateBack }}
            forward={{ disabled: false, onTrigger: navigateForward }}
          />
        }
        secondary={<Header.SecondaryRow state={{ view: "career", career }} />}
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
      <div className="flex items-center justify-between border-b border-border-subtle bg-bg px-3 py-1">
        <HeaderActionsMenu />
        <div className="flex-1" />
      </div>
      <ContinueOutstandingBand items={filteredOutstanding} onOpen={openDestination} />
      {report !== null && (
        <ContinueResultBand
          report={report}
          onOpen={openDestination}
          onDismiss={() => setReport(null)}
        />
      )}
    </>
  );
};

export const CareerChrome = ({ saveId }: { readonly saveId: SaveId }) => (
  <CareerStateProvider saveId={saveId}>
    <CareerChromeInner saveId={saveId} />
  </CareerStateProvider>
);