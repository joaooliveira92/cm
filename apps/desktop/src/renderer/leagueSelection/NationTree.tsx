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
import { useLeagueSelectionContext } from "./LeagueSelectionProvider.js";
import type { NationRowView, RegionGroupView } from "./viewModel.js";

const MODE_LABELS: Readonly<Record<SimulationMode, string>> = {
  playable: "Playable",
  background: "Background",
  view_only: "View only",
  not_loaded: "Not loaded",
};

const NationTreeRoot = () => {
  const { state: { view } } = useLeagueSelectionContext();

  if (view === null) {
    return <p className="text-text-secondary">Loading nations…</p>;
  }

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
        <NationTreeRegion key={region.regionId} region={region} />
      ))}
    </ul>
  );
};

const NationTreeRegion = ({
  region,
}: {
  readonly region: RegionGroupView;
}) => {
  const { actions: { dispatch } } = useLeagueSelectionContext();

  return (
    <li role="none">
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
            <NationTreeRow key={row.nation.id} row={row} />
          ))}
        </ul>
      )}
    </li>
  );
};

const NationTreeRow = ({
  row,
}: {
  readonly row: NationRowView;
}) => {
  const { state: { state: modelState }, actions: { dispatch } } = useLeagueSelectionContext();
  const { nation } = row;
  const expanded = modelState.expandedNationIds.includes(nation.id as string);
  const dependencyOnly = row.state === "included_by_dependency";
  const activeIds = new Set([...row.activeCompetitionIds, ...row.dependencyCompetitionIds]);

  const onToggle = () => dispatch({ type: "TOGGLE_NATION", nationId: nation.id as string });
  const onMode = (mode: SimulationMode) =>
    dispatch({
      type: "SET_NATION_MODE",
      nationId: nation.id as string,
      mode,
      fallbackScopeOptionId:
        (nation.recommendedScopeOptionId as string | null) ??
        (nation.scopeOptions[0]?.id as string | undefined) ??
        null,
    });
  const onScope = (scopeOptionId: string) =>
    dispatch({
      type: "SET_NATION_SCOPE",
      nationId: nation.id as string,
      scopeOptionId,
    });

  return (
    <li role="none">
      <div
        role="treeitem"
        aria-expanded={expanded}
        aria-selected={row.triState === "checked"}
        aria-checked={row.triState === "mixed" ? "mixed" : row.triState === "checked"}
        aria-disabled={!nation.available}
        tabIndex={0}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("select, option, label, input") !== null) return;
          onToggle();
        }}
        onKeyDown={(event) => {
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

export const NationTree = {
  Root: NationTreeRoot,
  Row: NationTreeRow,
};
