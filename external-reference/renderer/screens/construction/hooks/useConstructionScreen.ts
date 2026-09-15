import { useState } from "react";
import type {
  ConstructionCommandOutcome,
  ConstructionScreenProjection,
} from "../../../../shared/construction-contract.js";
import { useCommandScreenWorkflow } from "../../../lib/command-screen-workflow.js";
import type { ConstructionScreenState } from "../construction-screen-state.js";
import {
  acceptConstructionCommand,
  initialConstructionScreenState,
  projectConstructionScreen,
} from "../construction-screen-state.js";

export interface UseConstructionScreenReturn {
  readonly state: ConstructionScreenState;
  readonly loadError: string | null;
  readonly selectedDesignId: string | null;
  readonly request: {
    readonly outcomeUnknown: boolean;
    readonly retry: () => void;
  };
  readonly loadScreen: () => Promise<void>;
  readonly setSelectedDesignId: React.Dispatch<React.SetStateAction<string | null>>;
  readonly submit: () => void;
  readonly replace: (commandId: string) => void;
  readonly cancel: (commandId: string) => void;
}

export function useConstructionScreen(sessionId: string): UseConstructionScreenReturn {
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const bridge = window.bluewave;
  const workflow = useCommandScreenWorkflow<
    ConstructionScreenState,
    ConstructionScreenProjection,
    ConstructionCommandOutcome
  >({
    initialState: initialConstructionScreenState,
    load: () =>
      bridge
        ? bridge.campaign.execute("inspectConstructionScreen", sessionId)
        : Promise.reject(new Error("Bluewave bridge not available")),
    project: projectConstructionScreen,
    accept: acceptConstructionCommand,
    onProjection: (projection) =>
      setSelectedDesignId((current) => current ?? projection.designs[0]?.designId ?? null),
  });
  function submit(): void {
    if (!bridge || selectedDesignId === null) return;
    workflow.execute("submit", ({ expectedRevision, transportRequestId }) =>
      bridge.campaign.execute("submitConstructionCommand", {
        sessionId,
        designId: selectedDesignId,
        expectedRevision,
        transportRequestId,
      }),
    );
  }

  function replace(commandId: string): void {
    if (!bridge || selectedDesignId === null) return;
    workflow.execute("replace", ({ expectedRevision, transportRequestId }) =>
      bridge.campaign.execute("replaceConstructionCommand", {
        sessionId,
        commandId,
        designId: selectedDesignId,
        expectedRevision,
        transportRequestId,
      }),
    );
  }

  function cancel(commandId: string): void {
    if (!bridge) return;
    workflow.execute("cancel", ({ expectedRevision, transportRequestId }) =>
      bridge.campaign.execute("cancelConstructionCommand", {
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
    selectedDesignId,
    request: workflow.request,
    loadScreen: workflow.loadScreen,
    setSelectedDesignId,
    submit,
    replace,
    cancel,
  };
}
