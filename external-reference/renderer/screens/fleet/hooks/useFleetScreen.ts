import { useState } from "react";
import type {
  FleetScreenProjection,
  MovementCommandOutcome,
} from "../../../../shared/fleet-contract.js";
import { useCommandScreenWorkflow } from "../../../lib/command-screen-workflow.js";
import type { FleetScreenState } from "../fleet-screen-state.js";
import {
  acceptMovementCommand,
  initialFleetScreenState,
  projectFleetScreen,
} from "../fleet-screen-state.js";

export interface UseFleetScreenReturn {
  readonly state: FleetScreenState;
  readonly loadError: string | null;
  readonly selectedDivisionId: string | null;
  readonly destinationAreaId: string | null;
  readonly request: {
    readonly outcomeUnknown: boolean;
    readonly retry: () => void;
  };
  readonly loadScreen: () => Promise<void>;
  readonly setSelectedDivisionId: React.Dispatch<React.SetStateAction<string | null>>;
  readonly setDestinationAreaId: React.Dispatch<React.SetStateAction<string | null>>;
  readonly submit: () => void;
  readonly replace: (commandId: string) => void;
  readonly cancel: (commandId: string) => void;
}

export function useFleetScreen(sessionId: string): UseFleetScreenReturn {
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null);
  const [destinationAreaId, setDestinationAreaId] = useState<string | null>(null);
  const bridge = window.bluewave;
  const workflow = useCommandScreenWorkflow<
    FleetScreenState,
    FleetScreenProjection,
    MovementCommandOutcome
  >({
    initialState: initialFleetScreenState,
    load: () =>
      bridge
        ? bridge.campaign.execute("inspectFleetScreen", sessionId)
        : Promise.reject(new Error("Bluewave bridge not available")),
    project: projectFleetScreen,
    accept: acceptMovementCommand,
    onProjection: (projection) => {
      setSelectedDivisionId((current) => current ?? projection.divisions[0]?.divisionId ?? null);
      setDestinationAreaId((current) => current ?? projection.areas[0]?.id ?? null);
    },
  });
  function selectedDivision() {
    return workflow.state.divisions.find((division) => division.divisionId === selectedDivisionId);
  }

  function submit(): void {
    const division = selectedDivision();
    if (!bridge || !division || destinationAreaId === null) return;
    workflow.execute("submit", ({ expectedRevision, transportRequestId }) =>
      bridge.campaign.execute("submitMovementCommand", {
        sessionId,
        divisionId: division.divisionId,
        fromAreaId: division.areaId,
        toAreaId: destinationAreaId,
        expectedRevision,
        transportRequestId,
      }),
    );
  }

  function replace(commandId: string): void {
    const division = selectedDivision();
    if (!bridge || !division || destinationAreaId === null) return;
    workflow.execute("replace", ({ expectedRevision, transportRequestId }) =>
      bridge.campaign.execute("replaceMovementCommand", {
        sessionId,
        commandId,
        divisionId: division.divisionId,
        fromAreaId: division.areaId,
        toAreaId: destinationAreaId,
        expectedRevision,
        transportRequestId,
      }),
    );
  }

  function cancel(commandId: string): void {
    if (!bridge) return;
    workflow.execute("cancel", ({ expectedRevision, transportRequestId }) =>
      bridge.campaign.execute("cancelMovementCommand", {
        sessionId,
        commandId,
        expectedRevision,
        transportRequestId,
      }),
    );
  }

  return {
    state: workflow.state,
    loadError: workflow.loadError,
    selectedDivisionId,
    destinationAreaId,
    request: workflow.request,
    loadScreen: workflow.loadScreen,
    setSelectedDivisionId,
    setDestinationAreaId,
    submit,
    replace,
    cancel,
  };
}
