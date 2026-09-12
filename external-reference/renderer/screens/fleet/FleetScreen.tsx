import { useMemo } from "react";
import { Ship } from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader.js";
import { Badge } from "../../components/ui/badge.js";
import { Separator } from "../../components/ui/separator.js";
import { pendingRouteFor } from "./fleet-screen-state.js";
import { useFleetScreen } from "./hooks/useFleetScreen.js";
import { DivisionPicker } from "./components/DivisionPicker.js";
import { GeographyCard } from "./components/GeographyCard.js";
import { OrderSection } from "./components/OrderSection.js";
import { MovementCommandsTable } from "./components/MovementCommandsTable.js";
import { LoadErrorCard } from "./components/LoadErrorCard.js";
import { LoadingState } from "./components/LoadingState.js";

function FleetScreen({ sessionId }: { readonly sessionId: string }) {
  const {
    state,
    loadError,
    selectedDivisionId,
    destinationAreaId,
    request,
    loadScreen,
    setSelectedDivisionId,
    setDestinationAreaId,
    submit,
    replace,
    cancel,
  } = useFleetScreen(sessionId);

  const areaNameMap = useMemo(() => new Map(state.areas.map((a) => [a.id, a.name])), [state.areas]);

  function areaName(areaId: string): string {
    return areaNameMap.get(areaId) ?? areaId;
  }

  if (loadError !== null) {
    return (
      <div data-guided-target="fleet">
        <LoadErrorCard message={loadError} onReload={() => void loadScreen()} />
      </div>
    );
  }

  if (state.playerNationId === null) {
    return (
      <div data-guided-target="fleet">
        <LoadingState />
      </div>
    );
  }

  const busy = state.pendingRequest !== null || state.requiresRefresh;
  const selectedDivision =
    state.divisions.find((division) => division.divisionId === selectedDivisionId) ?? null;
  const pendingRoute =
    selectedDivision === null ? null : pendingRouteFor(state, selectedDivision.divisionId);

  return (
    <div data-guided-target="fleet" className="space-y-6">
      <PageHeader
        icon={Ship}
        title="Fleet Movement"
        description={state.month !== null ? `${state.month.month}/${state.month.year}` : undefined}
        actions={
          <Badge variant="outline" className="font-mono text-xs">
            Rev {state.revision}
          </Badge>
        }
      />
      <DivisionPicker
        divisions={state.divisions}
        selectedDivisionId={selectedDivisionId}
        onSelectDivision={setSelectedDivisionId}
        areaName={areaName}
      />
      <Separator />
      <GeographyCard
        areas={state.areas}
        areaEdges={state.areaEdges}
        ports={state.ports}
        areaName={areaName}
      />
      <Separator />
      <OrderSection
        areas={state.areas}
        selectedDivision={selectedDivision}
        destinationAreaId={destinationAreaId}
        onDestinationChange={setDestinationAreaId}
        pendingRoute={pendingRoute}
        busy={busy}
        onSubmit={submit}
        onReplace={replace}
        onCancel={cancel}
        onRefresh={() => void loadScreen()}
        hasPendingRequest={request.outcomeUnknown}
        onRetry={request.retry}
        notice={state.notice}
        areaName={areaName}
      />
      <Separator />
      <MovementCommandsTable commands={state.movementCommands} areaName={areaName} />
    </div>
  );
}

export { FleetScreen };
