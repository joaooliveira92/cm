import type { AdvancedOptionsPayload } from "@cm-clone/contracts";
import type { AdvancedOptionsKey, SimulationDepth } from "@cm-clone/shared";
import { useState, type ReactNode, type RefObject } from "react";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { AdvancedOptions } from "./AdvancedOptions.js";
import type { AddableLeagueView, GridRowView } from "./atoms.js";
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
  /** The catalogue's not-yet-active leagues, offered by the add control. */
  readonly addableLeagues: readonly AddableLeagueView[];
  readonly activeLeagueCount: number;
  readonly nationCount: number;
  readonly advancedOptions: AdvancedOptionsPayload;
  readonly blockingMessages?: readonly string[];
  readonly stale?: boolean;
  readonly onAddLeague: (leagueId: string) => void;
  readonly onChangeDepth: (leagueId: string, depth: SimulationDepth) => void;
  readonly onRemove: (leagueId: string) => void;
  readonly onChangeAdvancedOption: (key: AdvancedOptionsKey, value: string) => void;
  /** Applies the one-action setup preset. The route owns what a preset *is*; the workspace only
   *  knows that one action configures the whole scope. */
  readonly onApplySetupPreset: () => void;
  /** Opens the retained League & Nation tree for the pyramid work the grid cannot express. */
  readonly onManageLeagues: () => void;
  readonly advancedDefaultOpen?: boolean;
  /** The consequence sidebar, when the viewport is too narrow for its own column: it flows into
   *  this column after the league list and before the advanced section. */
  readonly inlineSidebar?: ReactNode;
  /** The last-resort focus target after a removal empties the row that had focus. */
  readonly manageLeaguesRef?: RefObject<HTMLButtonElement | null>;
}

export const ActiveLeaguesWorkspace = ({
  rows,
  addableLeagues,
  activeLeagueCount,
  nationCount,
  advancedOptions,
  blockingMessages = [],
  stale = false,
  onAddLeague,
  onChangeDepth,
  onRemove,
  onChangeAdvancedOption,
  onApplySetupPreset,
  onManageLeagues,
  advancedDefaultOpen = false,
  inlineSidebar,
  manageLeaguesRef,
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
    <div className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <AddLeagueControl candidates={addableLeagues} onAdd={onAddLeague} />
        <Button type="button" variant="secondary" size="sm" onClick={onApplySetupPreset}>
          Use setup preset
        </Button>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        ref={manageLeaguesRef}
        onClick={onManageLeagues}
      >
        Manage leagues
      </Button>
    </div>

    {inlineSidebar}

    <AdvancedOptions
      options={advancedOptions}
      onChange={onChangeAdvancedOption}
      issues={blockingMessages}
      defaultOpen={advancedDefaultOpen}
    />
  </div>
);

/**
 * Add one league from the available catalogue, without leaving the screen (user story 3).
 *
 * The candidate list is the catalogue *minus* what is already active, so a league on the grid is
 * not offered a second time — duplicate prevention shows up as an absent option rather than as a
 * refused click, and the reducer's own duplicate rail stays the backstop rather than the only
 * guard. The chosen candidate is ephemeral view state: nothing here is part of the configuration
 * until Add fires the intent.
 */
const AddLeagueControl = ({
  candidates,
  onAdd,
}: {
  readonly candidates: readonly AddableLeagueView[];
  readonly onAdd: (leagueId: string) => void;
}) => {
  const [chosen, setChosen] = useState("");
  const selectable = candidates.some((candidate) => candidate.leagueId === chosen);

  return (
    <div className="flex min-w-0 items-center gap-1">
      <select
        aria-label="League to add"
        className={`h-8 min-w-0 max-w-56 rounded-control border border-border-subtle bg-field-bg px-2 text-xs ${FOCUS_RING.join(" ")}`}
        value={selectable ? chosen : ""}
        disabled={candidates.length === 0}
        onChange={(event) => setChosen(event.target.value)}
      >
        <option value="">
          {candidates.length === 0 ? "Every league is active" : "Choose a league…"}
        </option>
        {candidates.map((candidate) => (
          <option key={candidate.leagueId} value={candidate.leagueId}>
            {candidate.nationName} — {candidate.leagueName}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!selectable}
        onClick={() => {
          if (!selectable) return;
          onAdd(chosen);
          setChosen("");
        }}
      >
        Add league
      </Button>
    </div>
  );
};
