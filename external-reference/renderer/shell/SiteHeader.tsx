import { ClockArrowRight, Play } from "lucide-react";

import { Button } from "../components/ui/button.js";
import { cn } from "../lib/utils.js";
import { Header, type NavAction } from "./header/index.js";
import { DRAG, NO_DRAG } from "./header/drag-region.js";
import type { PrimaryAction } from "./primary-action.js";
import type { SearchTarget } from "./global-search-state.js";
import type { ActiveView, HeaderCampaign } from "./site-header-state.js";
import { useWindowContext } from "./WindowContext.js";

const EMPTY_SEARCH_TARGETS: readonly SearchTarget[] = [];

export interface SiteHeaderProps {
  readonly title?: string;
  readonly activeView?: ActiveView;
  readonly campaign?: HeaderCampaign | null;
  readonly onActionClick?: (actionCode: string) => void;
  readonly back?: NavAction;
  readonly forward?: NavAction;
  readonly continueAction?: PrimaryAction;
  readonly searchTargets?: readonly SearchTarget[];
  readonly onSearchNavigate?: (id: string) => void;
  readonly onAdvanceMonth?: (() => void) | undefined;
  readonly advancingMonth?: boolean;
}

const NOOP = (): void => undefined;
const DISABLED_NAV: NavAction = { disabled: true, onTrigger: NOOP };

export function SiteHeader({
  title = "Naval Ministry",
  activeView = "menu",
  campaign = null,
  onActionClick,
  back = DISABLED_NAV,
  forward = DISABLED_NAV,
  continueAction,
  searchTargets = EMPTY_SEARCH_TARGETS,
  onSearchNavigate,
  onAdvanceMonth,
  advancingMonth = false,
}: SiteHeaderProps) {
  const { platform } = useWindowContext();
  const isMac = platform === "darwin";

  return (
    <header
      className="sticky top-0 z-50 flex h-24 w-full shrink-0 flex-col border-b bg-background/70 backdrop-blur-md select-none supports-[backdrop-filter]:bg-background/60"
      style={DRAG}
    >
      {/* Row 1: primary header */}
      <div
        className={cn(
          "flex h-14 w-full items-center gap-2 border-b pr-4",
          isMac ? "pl-25" : "pl-4",
        )}
      >
        <Header.Nav back={back} forward={forward} />

        <Header.Title title={title} />

        <div className="ml-auto flex items-center gap-2" style={NO_DRAG}>
          <Header.Search targets={searchTargets} onNavigate={(id) => onSearchNavigate?.(id)} />

          {continueAction !== undefined && (
            <Button
              variant="outline"
              aria-label={continueAction.label}
              onClick={continueAction.onTrigger}
              disabled={continueAction.disabled}
              className="w-44 shrink-0 justify-center gap-2"
            >
              <ClockArrowRight className="h-4 w-4" />
              <span className="truncate">{continueAction.label}</span>
            </Button>
          )}

          {campaign !== null && onAdvanceMonth !== undefined && (
            <Button
              variant="outline"
              aria-label="Advance month"
              data-guided-target="advance-month"
              title="Resolve the current strategic month"
              onClick={onAdvanceMonth}
              disabled={advancingMonth}
              className="h-8 shrink-0 justify-center gap-2 px-3"
            >
              <Play className="h-4 w-4" />
              <span className="truncate">{advancingMonth ? "Advancing…" : "Advance Month"}</span>
            </Button>
          )}

          <Header.Chrome />
          <Header.WindowControls />
        </div>
      </div>

      {/* Row 2: adaptive secondary bar */}
      <div className="flex h-10 w-full items-center px-4">
        <Header.SecondaryRow
          activeView={activeView}
          campaign={campaign}
          onActionClick={onActionClick}
        />
      </div>
    </header>
  );
}
