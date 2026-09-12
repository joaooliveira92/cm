import { useLeagueSelectionContext } from "./LeagueSelectionProvider.js";
import { formatBytes, formatCount, SPEED_LABELS } from "./viewModel.js";

const SummaryRow = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <div className="flex justify-between gap-2">
    <dt className="text-text-secondary">{label}</dt>
    <dd>{value}</dd>
  </div>
);

const SelectionSummaryRoot = () => {
  const { state: { estimate, state: modelState, stale } } = useLeagueSelectionContext();
  const estimateStatus = modelState.estimateStatus;

  return (
    <aside
      aria-label="Selection summary"
      aria-live="polite"
      aria-busy={stale}
      className="w-72 shrink-0 rounded-panel border border-panel-border bg-panel-bg p-3 text-sm shadow-panel"
    >
      <h3 className="font-semibold">Selection summary</h3>
      {estimate === null ? (
        <p className="mt-2 text-text-secondary">Calculating…</p>
      ) : (
        <>
          {stale && <p className="mt-1 text-xs text-text-muted">Updating estimate…</p>}
          {estimateStatus === "failed" && (
            <p role="status" className="mt-1 text-xs text-text-warning">
              The estimate could not be calculated. Your selection is unaffected.
            </p>
          )}
          <dl className={`mt-2 space-y-1 ${stale ? "opacity-60" : ""}`}>
            <SummaryRow label="Selected nations" value={formatCount(estimate.selectedNationCount)} />
            <SummaryRow label="Playable nations" value={formatCount(estimate.playableNationCount)} />
            <SummaryRow label="Playable competitions" value={formatCount(estimate.playableCompetitionCount)} />
            <SummaryRow label="Background competitions" value={formatCount(estimate.backgroundCompetitionCount)} />
            <SummaryRow label="Estimated clubs" value={formatCount(estimate.estimatedClubCount)} />
            <SummaryRow label="Estimated players" value={formatCount(estimate.estimatedPlayerCount)} />
            <SummaryRow label="Estimated staff" value={formatCount(estimate.estimatedStaffCount)} />
            <SummaryRow label="Memory estimate" value={formatBytes(estimate.estimatedMemoryBytes)} />
            <SummaryRow label="Save estimate" value={formatBytes(estimate.estimatedInitialSaveBytes)} />
            <SummaryRow
              label="Expected processing speed"
              value={SPEED_LABELS[estimate.simulationSpeedRating] ?? estimate.simulationSpeedRating}
            />
            <SummaryRow label="Estimate confidence" value={estimate.confidence} />
          </dl>
          <p className="mt-2 text-xs text-text-muted">
            Estimates are approximate and vary with this computer's load.
          </p>
        </>
      )}
    </aside>
  );
};

export const SelectionSummary = {
  Root: SelectionSummaryRoot,
};
