import type {
  BattleManifest,
  BattleResolution,
  RawScriptedForceOrder,
  ReplayBattleBoundaryResponse,
  TacticalBattleOutcome,
} from "@bluewave/campaign-engine";

const DEFAULT_SCRIPTED_ORDERS: readonly RawScriptedForceOrder[] = [
  {
    issueTurn: 1,
    divisionId: "Channel Squadron",
    orderType: "change_lead_division",
    newLeadShipId: "HMS Majestic",
  },
];

export interface TacticalSandboxScreenState {
  readonly warId: string;
  readonly turnCount: number;
  readonly scriptedOrdersText: string;
  readonly manifest: BattleManifest | null;
  readonly generateError: string | null;
  readonly autoResolution: BattleResolution | null;
  readonly tacticalOutcome: TacticalBattleOutcome | null;
  readonly resolveError: string | null;
  readonly boundaryReplay: ReplayBattleBoundaryResponse | null;
  readonly boundaryReplayError: string | null;
  readonly busy: boolean;
}

export function initialTacticalSandboxScreenState(): TacticalSandboxScreenState {
  return {
    warId: "war_uk_germany",
    turnCount: 200,
    scriptedOrdersText: JSON.stringify(DEFAULT_SCRIPTED_ORDERS, null, 2),
    manifest: null,
    generateError: null,
    autoResolution: null,
    tacticalOutcome: null,
    resolveError: null,
    boundaryReplay: null,
    boundaryReplayError: null,
    busy: false,
  };
}

export function updateWarId(
  state: TacticalSandboxScreenState,
  warId: string,
): TacticalSandboxScreenState {
  return { ...state, warId };
}

export function updateTurnCount(
  state: TacticalSandboxScreenState,
  turnCount: number,
): TacticalSandboxScreenState {
  return { ...state, turnCount };
}

export function updateScriptedOrdersText(
  state: TacticalSandboxScreenState,
  scriptedOrdersText: string,
): TacticalSandboxScreenState {
  return { ...state, scriptedOrdersText };
}

export type ParseScriptedOrdersResult =
  | { readonly ok: true; readonly orders: readonly RawScriptedForceOrder[] }
  | { readonly ok: false; readonly error: string };

export function parseScriptedOrders(text: string): ParseScriptedOrdersResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return {
      ok: false,
      error: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: "Scripted orders must be a JSON array." };
  }

  for (const [index, entry] of parsed.entries()) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Record<string, unknown>)["issueTurn"] !== "number" ||
      typeof (entry as Record<string, unknown>)["divisionId"] !== "string" ||
      typeof (entry as Record<string, unknown>)["orderType"] !== "string"
    ) {
      return {
        ok: false,
        error: `Order at index ${index} must include numeric issueTurn, divisionId, orderType.`,
      };
    }
  }

  return { ok: true, orders: parsed as readonly RawScriptedForceOrder[] };
}

export function beginRequest(state: TacticalSandboxScreenState): TacticalSandboxScreenState {
  return { ...state, busy: true };
}

export function applyManifestGenerated(
  state: TacticalSandboxScreenState,
  manifest: BattleManifest,
): TacticalSandboxScreenState {
  return {
    ...state,
    busy: false,
    manifest,
    generateError: null,
    autoResolution: null,
    tacticalOutcome: null,
    resolveError: null,
    boundaryReplay: null,
    boundaryReplayError: null,
  };
}

export function applyGenerateFailed(
  state: TacticalSandboxScreenState,
  error: string,
): TacticalSandboxScreenState {
  return { ...state, busy: false, generateError: error, manifest: null };
}

export function applyAutoResolution(
  state: TacticalSandboxScreenState,
  resolution: BattleResolution,
): TacticalSandboxScreenState {
  return {
    ...state,
    busy: false,
    autoResolution: resolution,
    resolveError: null,
  };
}

export function applyTacticalOutcome(
  state: TacticalSandboxScreenState,
  outcome: TacticalBattleOutcome,
): TacticalSandboxScreenState {
  return {
    ...state,
    busy: false,
    tacticalOutcome: outcome,
    resolveError: null,
  };
}

export function applyResolveFailed(
  state: TacticalSandboxScreenState,
  error: string,
): TacticalSandboxScreenState {
  return { ...state, busy: false, resolveError: error };
}

export function applyBoundaryReplayed(
  state: TacticalSandboxScreenState,
  boundaryReplay: ReplayBattleBoundaryResponse,
): TacticalSandboxScreenState {
  return { ...state, busy: false, boundaryReplay, boundaryReplayError: null };
}

export function applyBoundaryReplayFailed(
  state: TacticalSandboxScreenState,
  error: string,
): TacticalSandboxScreenState {
  return {
    ...state,
    busy: false,
    boundaryReplayError: error,
    boundaryReplay: null,
  };
}

export function groupEventsByType(
  outcome: TacticalBattleOutcome,
): readonly { readonly eventType: string; readonly count: number }[] {
  const counts = new Map<string, number>();
  for (const event of outcome.battleEventLedger.events) {
    counts.set(event.eventType, (counts.get(event.eventType) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([eventType, count]) => ({ eventType, count }))
    .sort((a, b) => b.count - a.count);
}
