import { Button } from "../components/ui/button.js";

/**
 * The setup introduction: the screen's heading and the anchor line above the workspace.
 *
 * The reference brief anchors this slot to a "currently selected team" chip. This game chooses
 * the club at a *later* step, so that chip has no referent here and the spec replaces it with the
 * anchor the domain can actually ground: a summary of the current scope selection, plus an inline
 * change action that opens Manage leagues. Nothing here is a control that selects nothing.
 *
 * The counts arrive as derived figures (`activeLeagueCount`, `nationCount` from the setup atoms);
 * this component counts nothing itself, so the line can never disagree with the grid below it.
 */

export interface SetupIntroductionProps {
  readonly activeLeagueCount: number;
  readonly nationCount: number;
  /** Opens the retained League & Nation tree — the same surface the workspace action opens. */
  readonly onManageLeagues: () => void;
  /** True while a newer resolve is in flight; the summary reads the previous answer meanwhile. */
  readonly stale?: boolean;
}

const pluralize = (count: number, singular: string): string =>
  `${count} ${count === 1 ? singular : `${singular}s`}`;

/** The scope sentence. An empty scope says so plainly rather than rendering "0 leagues across 0
 *  nations", because an empty setup is a validation state the player has to act on. */
export const describeScope = (activeLeagueCount: number, nationCount: number): string =>
  activeLeagueCount === 0
    ? "No leagues are active yet."
    : `${pluralize(activeLeagueCount, "active league")} across ${pluralize(nationCount, "nation")}.`;

export const SetupIntroduction = ({
  activeLeagueCount,
  nationCount,
  onManageLeagues,
  stale = false,
}: SetupIntroductionProps) => (
  <header className="flex items-baseline justify-between gap-3">
    <div className="flex min-w-0 items-baseline gap-3">
      <h1 className="text-base font-semibold text-text-primary">Active Leagues</h1>
      <p
        className="truncate text-xs text-text-secondary"
        aria-busy={stale ? "true" : undefined}
        data-testid="scope-summary"
      >
        {describeScope(activeLeagueCount, nationCount)}
      </p>
    </div>
    <Button type="button" variant="link" size="sm" onClick={onManageLeagues}>
      Change scope
    </Button>
  </header>
);
