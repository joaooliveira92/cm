import type {
  BattleManifest,
  BattleResolution,
  CommitMonthResponse,
  LandTargetDamage,
  MinePressure,
  SubmarinePool,
  TacticalBattleOutcome,
} from "@bluewave/campaign-engine";
import { useCallback, useEffect, useState } from "react";

import { emitWideEvent } from "../../../lib/telemetry.js";
import { auditInputFromDecisions, recordEngineAudit } from "../../../lib/engine-audit.js";

export interface UseSimulationScreenReturn {
  readonly loading: boolean;
  readonly error: string | null;
  readonly activeTab: string;
  readonly submarinePools: readonly SubmarinePool[];
  readonly minePressure: readonly MinePressure[];
  readonly landTargetDamage: readonly LandTargetDamage[];
  readonly commitResult: CommitMonthResponse | null;
  readonly battleManifest: BattleManifest | null;
  readonly autoResolution: BattleResolution | null;
  readonly tacticalOutcome: TacticalBattleOutcome | null;
  readonly battleLoading: boolean;
  readonly battleError: string | null;
  readonly setActiveTab: (tab: string) => void;
  readonly loadSnapshotData: () => Promise<void>;
  readonly handleAdvanceTurn: () => Promise<void>;
  readonly handleGenerateBattle: () => Promise<void>;
  readonly handleAutoResolve: () => Promise<void>;
  readonly handleTacticalResolve: () => Promise<void>;
}

export function useSimulationScreen(sessionId: string): UseSimulationScreenReturn {
  const bridge = window.bluewave;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [revision, setRevision] = useState<number>(0);
  const [_month, setMonth] = useState<{ year: number; month: number } | null>(null);
  const [submarinePools, setSubmarinePools] = useState<readonly SubmarinePool[]>([]);
  const [minePressure, setMinePressure] = useState<readonly MinePressure[]>([]);
  const [landTargetDamage, setLandTargetDamage] = useState<readonly LandTargetDamage[]>([]);
  const [_activeWars, setActiveWars] = useState<readonly unknown[]>([]);

  const [commitResult, setCommitResult] = useState<CommitMonthResponse | null>(null);

  const [battleManifest, setBattleManifest] = useState<BattleManifest | null>(null);
  const [autoResolution, setAutoResolution] = useState<BattleResolution | null>(null);
  const [tacticalOutcome, setTacticalOutcome] = useState<TacticalBattleOutcome | null>(null);
  const [battleLoading, setBattleLoading] = useState(false);
  const [battleError, setBattleError] = useState<string | null>(null);

  const loadSnapshotData = useCallback(async () => {
    if (bridge === undefined) return;
    try {
      setLoading(true);
      // `inspectCampaign` (not `inspectConstructionScreen` — that's ticket
      // 10's still-unimplemented stub) is the real source of the session's
      // current `revision`/`month`, needed so the very first `commitMonth`
      // call (ticket 13) sends a correct `expectedRevision` even when this
      // screen is opened after a save was loaded partway through a
      // campaign, not just right after `compileCampaign`.
      const res = await bridge.campaign.execute("inspectCampaign", sessionId);
      if (res.outcome === "success") {
        setRevision(res.value.projection.revision);
        setMonth(res.value.projection.month);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to inspect state");
    } finally {
      setLoading(false);
    }
  }, [bridge, sessionId]);

  useEffect(() => {
    void loadSnapshotData();
  }, [loadSnapshotData]);

  const handleAdvanceTurn = useCallback(async () => {
    if (bridge === undefined) return;
    const startTime = performance.now();
    try {
      setLoading(true);
      setError(null);
      const transportId = `desktop-commit-${Date.now()}`;
      const res = await bridge.campaign.execute("commitMonth", {
        sessionId,
        expectedRevision: revision,
        transportRequestId: transportId,
      });
      const duration = Math.round(performance.now() - startTime);
      if (res.outcome === "success") {
        emitWideEvent("month_commit", sessionId, duration, "success");
        recordEngineAudit("month_commit", {
          randomDecisions: res.value.randomDecisions ?? [],
          domainEvents: res.value.domainEvents ?? [],
          financialLedger: res.value.financialLedger ?? [],
        });
        setCommitResult(res.value);
        setRevision(Number(res.value.closingSnapshot.revision));
        setMonth(res.value.closingSnapshot.month);
        setSubmarinePools(res.value.closingSnapshot.submarinePools || []);
        setMinePressure(res.value.closingSnapshot.minePressure || []);
        setLandTargetDamage(res.value.closingSnapshot.landTargetDamage || []);
        setActiveWars(res.value.closingSnapshot.activeWars || []);
        setBattleManifest(null);
        setAutoResolution(null);
        setTacticalOutcome(null);
        setActiveTab("report");
      } else {
        emitWideEvent("month_commit", sessionId, duration, "rejected", [res.reason]);
        setError(`Failed to advance turn: ${res.reason}. ${res.diagnostics.join("; ")}`);
      }
    } catch (err) {
      const duration = Math.round(performance.now() - startTime);
      const errMsg = err instanceof Error ? err.message : "Error committing turn";
      emitWideEvent("month_commit", sessionId, duration, "rejected", [errMsg]);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [bridge, sessionId, revision]);

  const handleGenerateBattle = useCallback(async () => {
    if (bridge === undefined) return;
    const startTime = performance.now();
    try {
      setBattleLoading(true);
      setBattleError(null);
      setAutoResolution(null);
      setTacticalOutcome(null);

      const res = await bridge.campaign.execute("generateBattle", {
        sessionId,
        warId: "war_uk_germany",
      });
      const duration = Math.round(performance.now() - startTime);
      if (res.outcome === "success") {
        emitWideEvent("battle_generate", sessionId, duration, "success");
        recordEngineAudit(
          "battle_generate",
          auditInputFromDecisions(res.value.randomDecisions ?? []),
        );
        setBattleManifest(res.value.manifest);
      } else {
        emitWideEvent("battle_generate", sessionId, duration, "rejected", [res.reason]);
        setBattleError(
          `Failed to generate battle: ${res.reason}. ${res.diagnostics?.join("; ") || ""}`,
        );
      }
    } catch (err) {
      const duration = Math.round(performance.now() - startTime);
      const errMsg = err instanceof Error ? err.message : "Error generating battle";
      emitWideEvent("battle_generate", sessionId, duration, "rejected", [errMsg]);
      setBattleError(errMsg);
    } finally {
      setBattleLoading(false);
    }
  }, [bridge, sessionId]);

  const handleAutoResolve = useCallback(async () => {
    if (bridge === undefined || battleManifest === null) return;
    const startTime = performance.now();
    try {
      setBattleLoading(true);
      setBattleError(null);
      const res = await bridge.campaign.execute("resolveBattle", {
        sessionId,
        battleId: battleManifest.battleId,
      });
      const duration = Math.round(performance.now() - startTime);
      if (res.outcome === "success") {
        emitWideEvent("battle_resolve", sessionId, duration, "success");
        setAutoResolution(res.value.resolution);
      } else {
        emitWideEvent("battle_resolve", sessionId, duration, "rejected", [res.reason]);
        setBattleError(`Failed to resolve: ${res.reason}`);
      }
    } catch (err) {
      const duration = Math.round(performance.now() - startTime);
      const errMsg = err instanceof Error ? err.message : "Error resolving battle";
      emitWideEvent("battle_resolve", sessionId, duration, "rejected", [errMsg]);
      setBattleError(errMsg);
    } finally {
      setBattleLoading(false);
    }
  }, [bridge, sessionId, battleManifest]);

  const handleTacticalResolve = useCallback(async () => {
    if (bridge === undefined || battleManifest === null) return;
    const startTime = performance.now();
    try {
      setBattleLoading(true);
      setBattleError(null);
      const scriptedOrders = [
        {
          issueTurn: 1,
          divisionId: "Channel Squadron",
          orderType: "change_lead_division" as const,
          newLeadShipId: "HMS Majestic",
        },
        {
          issueTurn: 1,
          divisionId: "Channel Squadron",
          orderType: "target_ship" as const,
        },
        {
          issueTurn: 1,
          divisionId: "Cruiser Squadron",
          orderType: "flotilla_attack" as const,
          targetDivisionId: "Scouting Group",
        },
        {
          issueTurn: 2,
          divisionId: "High Seas Squadron",
          orderType: "rally" as const,
          rallyPoint: { x: 500, y: 500 },
        },
        {
          issueTurn: 3,
          divisionId: "Scouting Group",
          orderType: "disengage" as const,
        },
      ];

      const res = await bridge.campaign.execute("resolveTacticalBattle", {
        sessionId,
        battleId: battleManifest.battleId,
        turnCount: 200,
        scriptedOrders,
      });
      const duration = Math.round(performance.now() - startTime);
      if (res.outcome === "success") {
        emitWideEvent("battle_resolve_tactical", sessionId, duration, "success");
        recordEngineAudit(
          "battle_resolve_tactical",
          auditInputFromDecisions(res.value.randomDecisions ?? []),
        );
        setTacticalOutcome(res.value.outcome);
      } else {
        emitWideEvent("battle_resolve_tactical", sessionId, duration, "rejected", [res.reason]);
        setBattleError(`Failed to resolve tactically: ${res.reason}`);
      }
    } catch (err) {
      const duration = Math.round(performance.now() - startTime);
      const errMsg = err instanceof Error ? err.message : "Error resolving tactical battle";
      emitWideEvent("battle_resolve_tactical", sessionId, duration, "rejected", [errMsg]);
      setBattleError(errMsg);
    } finally {
      setBattleLoading(false);
    }
  }, [bridge, sessionId, battleManifest]);

  return {
    loading,
    error,
    activeTab,
    submarinePools,
    minePressure,
    landTargetDamage,
    commitResult,
    battleManifest,
    autoResolution,
    tacticalOutcome,
    battleLoading,
    battleError,
    setActiveTab,
    loadSnapshotData,
    handleAdvanceTurn,
    handleGenerateBattle,
    handleAutoResolve,
    handleTacticalResolve,
  };
}
