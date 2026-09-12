import type {
  DomainEvent,
  FinancialLedgerEntry,
  AIPlan,
  RandomDecisionRecord,
  MonthReport,
  CommandLedgerEntry,
  DockyardProject,
  SubmarinePool,
  MinePressure,
  LandTargetDamage,
  BattleManifest,
  BattleResolution,
  TacticalBattleOutcome,
} from "@bluewave/campaign-engine";
import type { RequestLifecycle } from "../../lib/command-screen-workflow.js";

export interface SimulationScreenState extends RequestLifecycle {
  readonly month: { readonly year: number; readonly month: number } | null;
  readonly activeWars: readonly {
    readonly warId: string;
    readonly attackerId: string;
    readonly defenderId: string;
  }[];
  readonly submarinePools: readonly SubmarinePool[];
  readonly minePressure: readonly MinePressure[];
  readonly landTargetDamage: readonly LandTargetDamage[];

  // Last month resolution outcome data
  readonly lastReport: MonthReport | null;
  readonly lastDomainEvents: readonly DomainEvent[];
  readonly lastFinancialLedger: readonly FinancialLedgerEntry[];
  readonly lastAiPlan: AIPlan | null;
  readonly lastRandomDecisions: readonly RandomDecisionRecord[];
  readonly lastCommandLedger: readonly CommandLedgerEntry[];
  readonly lastProjects: readonly DockyardProject[];

  // Active battles
  readonly activeBattleManifest: BattleManifest | null;
  readonly activeBattleResolution: BattleResolution | null;
  readonly activeTacticalOutcome: TacticalBattleOutcome | null;
}

export function initialSimulationScreenState(): SimulationScreenState {
  return {
    revision: 0,
    month: null,
    activeWars: [],
    submarinePools: [],
    minePressure: [],
    landTargetDamage: [],
    lastReport: null,
    lastDomainEvents: [],
    lastFinancialLedger: [],
    lastAiPlan: null,
    lastRandomDecisions: [],
    lastCommandLedger: [],
    lastProjects: [],
    activeBattleManifest: null,
    activeBattleResolution: null,
    activeTacticalOutcome: null,
    pendingRequest: null,
    requiresRefresh: false,
    notice: null,
  };
}
