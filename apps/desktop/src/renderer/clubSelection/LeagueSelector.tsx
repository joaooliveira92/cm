import { LEAGUE_NAME } from "@cm-clone/shared";

/**
 * The league selector, built degenerate on purpose: the one option names the League generation
 * actually materializes (the shared `LEAGUE_NAME` content constant), never the scope the
 * `LeagueSelectionSnapshot` recorded as intent — generation does not honour the snapshot yet, so
 * naming its competitions above clubs that are not in them would be a lie about the world.
 *
 * It ships **disabled**, with a persistent label and a described reason. An enabled one-option
 * `<select>` is the accessibility trap: announced as changeable, changing nothing. The control's
 * shape is exactly what becomes real when a second League exists — it flips to enabled rather
 * than being redesigned — and nothing should re-enable it before that change wires real
 * attribution in the same commit.
 */
export const LeagueSelector = () => (
  <div className="flex flex-col gap-1">
    <label
      htmlFor="club-selection-league"
      className="text-2xs font-semibold tracking-wide text-text-muted uppercase"
    >
      League
    </label>
    <select
      id="club-selection-league"
      disabled
      aria-describedby="club-selection-league-hint"
      value={LEAGUE_NAME}
      onChange={() => {}}
      className="rounded-control border border-border-subtle bg-surface-raised px-2 py-1 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-70"
    >
      <option value={LEAGUE_NAME}>{LEAGUE_NAME}</option>
    </select>
    <p id="club-selection-league-hint" className="text-xs text-text-muted">
      A career is generated in one League, so there is nothing to switch between yet.
    </p>
  </div>
);
