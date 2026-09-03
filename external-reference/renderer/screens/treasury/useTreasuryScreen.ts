import { useCallback, useEffect, useState } from "react";
import {
  applyProjectionLoaded,
  applyLoadFailed,
  initialTreasuryScreenState,
} from "./treasury-screen-state.js";

/**
 * Loads the Treasury read-only projection via `inspectCampaign` (spec §9).
 * Read-only over the engine — no Treasury-specific command, no budget
 * controls, nothing computed against authoritative state.
 */
export function useTreasuryScreen(sessionId: string) {
  const bridge = window.bluewave;
  const [state, setState] = useState(initialTreasuryScreenState);

  const loadScreen = useCallback(async () => {
    if (bridge === undefined) {
      setState((current) => applyLoadFailed(current, "Bluewave bridge not available"));
      return;
    }
    const result = await bridge.campaign.execute("inspectCampaign", sessionId);
    if (result.outcome !== "success") {
      setState((current) => applyLoadFailed(current, result.reason));
      return;
    }
    setState((current) => applyProjectionLoaded(current, result.value.projection));
  }, [bridge, sessionId]);

  useEffect(() => {
    void loadScreen();
  }, [loadScreen]);

  return { state, reload: loadScreen };
}
