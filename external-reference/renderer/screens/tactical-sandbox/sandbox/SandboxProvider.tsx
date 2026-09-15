import { createContext, use, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  applyAutoResolution,
  applyBoundaryReplayed,
  applyBoundaryReplayFailed,
  applyGenerateFailed,
  applyManifestGenerated,
  applyResolveFailed,
  applyTacticalOutcome,
  beginRequest,
  initialTacticalSandboxScreenState,
  parseScriptedOrders,
  updateScriptedOrdersText,
  updateTurnCount,
  updateWarId,
  type TacticalSandboxScreenState,
} from "../tactical-sandbox-screen-state.js";

export interface SandboxContextValue {
  readonly state: TacticalSandboxScreenState;
  readonly actions: {
    readonly updateWarId: (warId: string) => void;
    readonly updateTurnCount: (turnCount: number) => void;
    readonly updateScriptedOrdersText: (text: string) => void;
    readonly generateBattle: () => void;
    readonly autoResolve: () => void;
    readonly tacticalResolve: () => void;
    readonly replayBoundary: () => void;
  };
}

const SandboxContext = createContext<SandboxContextValue | null>(null);

export function SandboxProvider({
  sessionId,
  children,
}: {
  readonly sessionId: string;
  readonly children: ReactNode;
}) {
  const bridge = window.bluewave;
  const [state, setState] = useState(initialTacticalSandboxScreenState);

  const generateBattle = useCallback(async () => {
    if (bridge === undefined) return;
    setState((current) => beginRequest(current));
    const result = await bridge.campaign.execute("generateBattle", {
      sessionId,
      warId: state.warId,
    });
    if (result.outcome === "success") {
      setState((current) => applyManifestGenerated(current, result.value.manifest));
    } else {
      setState((current) => applyGenerateFailed(current, result.reason));
    }
  }, [bridge, sessionId, state.warId]);

  const autoResolve = useCallback(async () => {
    if (bridge === undefined || state.manifest === null) return;
    setState((current) => beginRequest(current));
    const result = await bridge.campaign.execute("resolveBattle", {
      sessionId,
      battleId: state.manifest.battleId,
    });
    if (result.outcome === "success") {
      setState((current) => applyAutoResolution(current, result.value.resolution));
    } else {
      setState((current) => applyResolveFailed(current, result.reason));
    }
  }, [bridge, sessionId, state.manifest]);

  const tacticalResolve = useCallback(async () => {
    if (bridge === undefined || state.manifest === null) return;
    const parsed = parseScriptedOrders(state.scriptedOrdersText);
    if (!parsed.ok) {
      setState((current) => applyResolveFailed(current, parsed.error));
      return;
    }
    setState((current) => beginRequest(current));
    const result = await bridge.campaign.execute("resolveTacticalBattle", {
      sessionId,
      battleId: state.manifest.battleId,
      turnCount: state.turnCount,
      scriptedOrders: parsed.orders,
    });
    if (result.outcome === "success") {
      setState((current) => applyTacticalOutcome(current, result.value.outcome));
    } else {
      setState((current) => applyResolveFailed(current, result.reason));
    }
  }, [bridge, sessionId, state.manifest, state.scriptedOrdersText, state.turnCount]);

  const replayBoundary = useCallback(async () => {
    if (bridge === undefined || state.manifest === null) return;
    setState((current) => beginRequest(current));
    const result = await bridge.campaign.execute("replayBattleBoundary", {
      sessionId,
      battleId: state.manifest.battleId,
    });
    if (result.outcome === "success") {
      setState((current) => applyBoundaryReplayed(current, result.value));
    } else {
      setState((current) => applyBoundaryReplayFailed(current, result.reason));
    }
  }, [bridge, sessionId, state.manifest]);

  const value = useMemo<SandboxContextValue>(
    () => ({
      state,
      actions: {
        updateWarId: (warId) => setState((current) => updateWarId(current, warId)),
        updateTurnCount: (turnCount) => setState((current) => updateTurnCount(current, turnCount)),
        updateScriptedOrdersText: (text) =>
          setState((current) => updateScriptedOrdersText(current, text)),
        generateBattle: () => void generateBattle(),
        autoResolve: () => void autoResolve(),
        tacticalResolve: () => void tacticalResolve(),
        replayBoundary: () => void replayBoundary(),
      },
    }),
    [state, generateBattle, autoResolve, tacticalResolve, replayBoundary],
  );

  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>;
}

export function useSandbox(): SandboxContextValue {
  const context = use(SandboxContext);
  if (context === null) {
    throw new Error("useSandbox must be used within SandboxProvider");
  }
  return context;
}
