import type { AdvancedOptionsPayload } from "@cm-clone/contracts";
import type { AdvancedOptionsKey, SimulationDepth } from "@cm-clone/shared";
import { Button } from "../components/ui/button.js";
import { AdvancedOptions } from "./AdvancedOptions.js";
import type { GridRowView } from "./atoms.js";
import { LeagueGrid } from "./LeagueGrid.js";
import { SetupIntroduction } from "./SetupIntroduction.js";

/**
 * The dense configuration workspace: the primary column of the Active Leagues screen.
 *
 * Its shape is the spec's interaction principle, in order down the column — the introduction
 * anchored to the current scope, the dense editable league list, the secondary workspace actions,
 * and, below a full-width separator, the collapsible advanced options. The final commitment
 * action lives in the footer beside the sidebar, never here, so the workspace actions stay
 * visibly subordinate to it.
 *
 * The league list is the *only* region that scrolls: the surrounding column is a flex layout in
 * which just that region takes the overflow, so the actions, the advanced section, the sidebar,
 * and the footer never leave view when a broad scope fills the table. The workspace actions carry
 * `margin-top: auto`, so they sit against the bottom of the column when the list is short and
 * directly under the list when it is long — and they are never in the table header.
 *
 * Presentational: every interaction leaves as a typed intent through a callback. This component
 * owns no configuration state and never touches IPC.
 */

export interface ActiveLeaguesWorkspaceProps {
  readonly rows: readonly GridRowView[];
  readonly activeLeagueCount: number;
  readonly nationCount: number;
  readonly advancedOptions: AdvancedOptionsPayload;
  readonly blockingMessages?: readonly string[];
  readonly stale?: boolean;
  readonly onChangeDepth: (leagueId: string, depth: SimulationDepth) => void;
  readonly onRemove: (leagueId: string) => void;
  readonly onChangeAdvancedOption: (key: AdvancedOptionsKey, value: string) => void;
  /** Applies the one-action setup preset. The route owns what a preset *is*; the workspace only
   *  knows that one action configures the whole scope. */
  readonly onApplySetupPreset: () => void;
  /** Opens the retained League & Nation tree for the pyramid work the grid cannot express. */
  readonly onManageLeagues: () => void;
  readonly advancedDefaultOpen?: boolean;
}

export const ActiveLeaguesWorkspace = ({
  rows,
  activeLeagueCount,
  nationCount,
  advancedOptions,
  blockingMessages = [],
  stale = false,
  onChangeDepth,
  onRemove,
  onChangeAdvancedOption,
  onApplySetupPreset,
  onManageLeagues,
  advancedDefaultOpen = false,
}: ActiveLeaguesWorkspaceProps) => (
  <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
    <SetupIntroduction
      activeLeagueCount={activeLeagueCount}
      nationCount={nationCount}
      onManageLeagues={onManageLeagues}
      stale={stale}
    />

    {/* The one scrolling region on the screen. */}
    <div className="min-h-0 flex-1 overflow-y-auto" data-testid="league-list-region">
      <LeagueGrid rows={rows} onChangeDepth={onChangeDepth} onRemove={onRemove} />
    </div>

    {/* Secondary actions, pushed to the bottom of the column and subordinate to Continue. */}
    <div className="mt-auto flex shrink-0 items-center justify-between gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={onApplySetupPreset}>
        Use setup preset
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={onManageLeagues}>
        Manage leagues
      </Button>
    </div>

    <AdvancedOptions
      options={advancedOptions}
      onChange={onChangeAdvancedOption}
      issues={blockingMessages}
      defaultOpen={advancedDefaultOpen}
    />
  </div>
);
