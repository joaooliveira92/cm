import { useCallback, useEffect, useState } from "react";
import type { UiStateFirstMonthInspection } from "../../shared/campaign-command-contract.js";
import {
  GUIDED_STEP_COUNT,
  dismissedInspectionState,
  emptyInspection,
  nextInspectionState,
  restartedInspection,
  resumeStepIndex,
  shouldAutoOpen,
} from "./guided-inspection-state.js";

export interface UseGuidedInspectionOptions {
  readonly sessionId: string | null;
}

export interface UseGuidedInspectionResult {
  readonly inspection: UiStateFirstMonthInspection | undefined;
  readonly stepIndex: number;
  readonly visible: boolean;
  readonly loading: boolean;
  advance: (currentIndex: number) => Promise<void>;
  dismiss: (currentIndex: number) => Promise<void>;
  restart: () => Promise<void>;
  setVisible: (v: boolean) => void;
}

async function readInspection(sessionId: string): Promise<UiStateFirstMonthInspection | undefined> {
  const bridge = window.bluewave;
  if (bridge === undefined) return undefined;
  const result = (await bridge.campaign.execute("readUiState", sessionId)) as unknown as {
    outcome: string;
    value?: { uiState?: { firstMonthInspection?: UiStateFirstMonthInspection } };
  };
  if (result.outcome !== "success") return undefined;
  return result.value?.uiState?.firstMonthInspection;
}

async function writeInspection(
  sessionId: string,
  inspection: UiStateFirstMonthInspection,
): Promise<UiStateFirstMonthInspection | undefined> {
  const bridge = window.bluewave;
  if (bridge === undefined) return undefined;
  // Merge semantics: writeUiState carries dismissedFingerprints (empty for now) + inspection
  const readBefore = await bridge.campaign.execute("readUiState", sessionId);
  const dismissed =
    readBefore.outcome === "success" ? [...readBefore.value.uiState.dismissedFingerprints] : [];
  const result = await bridge.campaign.execute("writeUiState", {
    sessionId,
    dismissedFingerprints: dismissed,
    firstMonthInspection: inspection,
  });
  if (result.outcome !== "success") return undefined;
  return result.value.uiState.firstMonthInspection;
}

export function useGuidedInspection(
  options: UseGuidedInspectionOptions,
): UseGuidedInspectionResult {
  const { sessionId } = options;
  const [inspection, setInspection] = useState<UiStateFirstMonthInspection | undefined>(undefined);
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId === null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const stored = await readInspection(sessionId);
      if (cancelled) return;
      if (stored === undefined) {
        setInspection(emptyInspection());
        setStepIndex(0);
        setVisible(true);
      } else if (stored.status === "completed" || stored.status === "dismissed") {
        setInspection(stored);
        setVisible(false);
        setStepIndex(0);
      } else if (stored.status === "not_started") {
        setInspection(stored);
        setStepIndex(0);
        // Auto-open only on not_started per spec
        setVisible(shouldAutoOpen(stored));
      } else {
        // in_progress — resume from lastCompletedStep + 1
        setInspection(stored);
        setStepIndex(resumeStepIndex(stored));
        setVisible(true);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const advance = useCallback(
    async (currentIndex: number) => {
      if (sessionId === null) return;
      const current = inspection ?? emptyInspection();
      const next = nextInspectionState(current, currentIndex);
      const isLast = currentIndex >= GUIDED_STEP_COUNT - 1;
      // If completing on last step, hide immediately
      if (isLast) {
        const persisted = await writeInspection(sessionId, next);
        setInspection(persisted ?? next);
        setVisible(false);
        return;
      }
      // Otherwise advance to next step and persist lastCompletedStep
      const persisted = await writeInspection(sessionId, next);
      setInspection(persisted ?? next);
      setStepIndex(currentIndex + 1);
      // Spec §17: autosave is the writeUiState itself (renderer-owned sidecar, not authoritative)
      // No additional saveCampaign needed.
    },
    [sessionId, inspection],
  );

  const dismiss = useCallback(
    async (currentIndex: number) => {
      if (sessionId === null) {
        setVisible(false);
        return;
      }
      const next = dismissedInspectionState(currentIndex);
      const persisted = await writeInspection(sessionId, next);
      setInspection(persisted ?? next);
      setVisible(false);
    },
    [sessionId],
  );

  const restart = useCallback(async () => {
    if (sessionId === null) return;
    const next = restartedInspection();
    const persisted = await writeInspection(sessionId, next);
    setInspection(persisted ?? next);
    setStepIndex(0);
    setVisible(true);
  }, [sessionId]);

  return { inspection, stepIndex, visible, loading, advance, dismiss, restart, setVisible };
}
