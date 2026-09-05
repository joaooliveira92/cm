/**
 * §5.3 Nation and league browser. A real tree: `treeitem` rows under `group`s,
 * with the expansion and selection state exposed rather than implied by styling
 * (§25.1).
 */
import type * as React from "react";
import { SIMULATION_MODES, type SimulationMode } from "@cm-clone/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { FOCUS_RING } from "../focus.js";
import { SELECT_CLASS_COMPACT } from "./selectStyles.js";
import type {
  BrowserView,
  LeagueSelectionCommand,
  LeagueSelectionState,
  NationRowView,
} from "./viewModel.js";

const MODE_LABELS: Readonly<Record<SimulationMode, string>> = {
  playable: "Playable",
  background: "Background",
  view_only: "View only",
  not_loaded: "Not loaded",
};

export const NationTree = ({
  view,
  state,
  dispatch,
}: {
  readonly view: BrowserView;
  readonly state: LeagueSelectionState;
  readonly dispatch: React.Dispatch<LeagueSelectionCommand>;
}) => {
  if (view.totalMatchCount === 0) {
    return (
      <p role="status" className="text-sm text-text-secondary">
        No nations or competitions match your search. The selection is unchanged.
      </p>
    );
  }

  return (
    <ul role="tree" aria-label="Nations and leagues" className="space-y-1">
      {view.regions.map((region) => (
        <li key={region.regionId} role="none">
          <button
            type="button"
            role="treeitem"
            aria-expanded={region.expanded}
            aria-label={`${region.regionName}, ${region.nations.length} nations`}
            className={`w-full rounded-control px-2 py-1 text-left text-sm font-semibold hover:bg-surface ${FOCUS_RING.join(" ")}`}
            onClick={() => dispatch({ type: "TOGGLE_REGION", regionId: region.regionId })}
          >
            {region.expanded ? "▾" : "▸"} {region.regionName}
          </button>
          {region.expanded && (
            <ul role="group" className="ml-4 space-y-1">
              {region.nations.map((row) => (
                <NationTreeRow
                  key={row.nation.id}
                  row={row}
                  expanded={state.expandedNationIds.includes(row.nation.id as string)}
                  onToggle={() =>
                    dispatch({ type: "TOGGLE_NATION", nationId: row.nation.id as string })
                  }
                  onMode={(mode) =>
                    dispatch({
                      type: "SET_NATION_MODE",
                      nationId: row.nation.id as string,
                      mode,
                      fallbackScopeOptionId:
                        (row.nation.recommendedScopeOptionId as string | null) ??
                        (row.nation.scopeOptions[0]?.id as string | undefined) ??
                        null,
                    })
                  }
                  onScope={(scopeOptionId) =>
                    dispatch({
                      type: "SET_NATION_SCOPE",
                      nationId: row.nation.id as string,
                      scopeOptionId,
                    })
                  }
                />
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
};

/**
 * One Nation row and its pyramid.
 *
 * The mode selector offers `Playable` only when the database supports it (§7.3), and the whole
 * row is inert for an unavailable Nation (§7.1) — which stays *visible*, with the reason, rather
 * than being hidden.
 */
const NationTreeRow = ({
  row,
  expanded,
  onToggle,
  onMode,
  onScope,
}: {
  readonly row: NationRowView;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly onMode: (mode: SimulationMode) => void;
  readonly onScope: (scopeOptionId: string) => void;
}) => {
  const { nation } = row;
  const dependencyOnly = row.state === "included_by_dependency";
  const activeIds = new Set([...row.activeCompetitionIds, ...row.dependencyCompetitionIds]);

  return (
    <li role="none">
      <div
        role="treeitem"
        aria-expanded={expanded}
        aria-selected={row.triState === "checked"}
        // §7.2, §25.1. The mixed state is carried in the accessible semantics, not only in the
        // glyph, so a screen-reader user hears "partially selected" rather than nothing.
        aria-checked={row.triState === "mixed" ? "mixed" : row.triState === "checked"}
        aria-disabled={!nation.available}
        tabIndex={0}
        // The whole row toggles, which is what a tree row is expected to do — but a click that
        // originated in one of the row's own controls is that control's, not the row's, or
        // choosing a mode would collapse the pyramid the choice just changed.
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("select, option, label, input") !== null) return;
          onToggle();
        }}
        onKeyDown={(event) => {
          // §24. Right/Left expand and collapse; Enter and Space toggle. Arrow-key traversal
          // between rows is the browser's own focus order here.
          if (event.key === "ArrowRight" && !expanded) onToggle();
          if (event.key === "ArrowLeft" && expanded) onToggle();
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        className={`flex flex-wrap items-center gap-3 rounded px-2 py-1 ${FOCUS_RING.join(" ")} ${
          row.matchesSearch ? "bg-surface" : ""
        }`}
      >
        <span aria-hidden="true" className="text-text-muted">
          {expanded ? "▾" : "▸"}
        </span>
        <span className="min-w-40">{nation.name}</span>

        {!nation.available ? (
          // Non-colour indicator as well as the disabled state (§25.3).
          <span className="text-xs text-text-muted">Unavailable — content not installed</span>
        ) : !nation.playableSupported ? (
          <span className="text-xs text-text-secondary">Background data only</span>
        ) : null}

        {nation.available && (
          <label className="flex items-center gap-1 text-xs text-text-secondary">
            Mode
            <Select
              value={row.mode}
              onValueChange={(value) => {
                if (value !== null) onMode(value as SimulationMode);
              }}
            >
              <SelectTrigger
                aria-label={`Simulation mode for ${nation.name}`}
                className={SELECT_CLASS_COMPACT}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIMULATION_MODES.filter(
                  (mode) => mode !== "playable" || nation.playableSupported,
                ).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}

        {row.mode === "playable" && nation.scopeOptions.length > 0 && (
          <label className="flex items-center gap-1 text-xs text-text-secondary">
            Scope
            <Select
              value={row.scopeOptionId ?? ""}
              onValueChange={(value) => {
                if (value !== null) onScope(value);
              }}
            >
              <SelectTrigger
                aria-label={`League scope for ${nation.name}`}
                className={SELECT_CLASS_COMPACT}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nation.scopeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}

        {dependencyOnly && (
          <span className="text-xs text-sky-300">Included because another selection needs it</span>
        )}
        {row.issues.some((entry) => entry.level !== "info") && (
          <span className="text-xs text-text-warning">! {row.issues[0]?.message}</span>
        )}
      </div>

      {expanded && (
        <ul role="group" className="ml-6 mt-1 space-y-0.5 text-xs">
          {nation.competitions.length === 0 && (
            <li className="text-text-muted">This nation has no competitions in this database.</li>
          )}
          {nation.competitions.map((competition) => {
            const isDependency = row.dependencyCompetitionIds.includes(competition.id as string);
            return (
              <li key={competition.id} role="treeitem" aria-selected={activeIds.has(competition.id as string)}>
                <span className={activeIds.has(competition.id as string) ? "text-text-strong" : "text-text-muted"}>
                  {activeIds.has(competition.id as string) ? "✓" : "·"} {competition.name}
                </span>
                {/* §12.1. An automatically included competition explains itself in place, rather
                    than looking like a choice the user made and forgot. */}
                {isDependency && (
                  <span className="ml-2 text-sky-300">required by your selection</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
};
