import { useCallback, useEffect, useRef, useState } from "react";

import type { BridgeResult } from "../../shared/bridge-contract.js";

export type RequestKind = "submit" | "replace" | "cancel";

export interface PendingRequest {
  readonly kind: RequestKind;
  readonly transportRequestId: string;
}

export interface RequestLifecycle {
  readonly revision: number;
  readonly pendingRequest: PendingRequest | null;
  readonly requiresRefresh: boolean;
  readonly notice: string | null;
}

export interface CommandExecutionContext {
  readonly expectedRevision: number;
  readonly transportRequestId: string;
}

export type CommandSender<Value> = (
  context: CommandExecutionContext,
) => Promise<BridgeResult<Value>>;

export interface PreparedCommand<Value> {
  readonly kind: RequestKind;
  readonly context: CommandExecutionContext;
  readonly send: CommandSender<Value>;
}

export interface CommandScreenAdapter<
  State extends RequestLifecycle,
  Projection extends { readonly revision: number },
  Value,
> {
  readonly initialState: () => State;
  readonly load: () => Promise<BridgeResult<Projection>>;
  /** Map a projection's domain fields into the state; lifecycle is handled by the module. */
  readonly project: (projection: Projection) => Partial<State>;
  /** Map an accepted command's domain fields and produce the resulting notice. */
  readonly accept: (value: Value) => {
    readonly patch: Partial<State>;
    readonly notice: string;
  };
  readonly onProjection?: (projection: Projection) => void;
}

export interface CommandScreenWorkflow<State extends RequestLifecycle, Value> {
  readonly state: State;
  readonly loadError: string | null;
  readonly request: {
    readonly outcomeUnknown: boolean;
    readonly retry: () => void;
  };
  readonly loadScreen: () => Promise<void>;
  readonly execute: (kind: RequestKind, send: CommandSender<Value>) => void;
}

export function describeRejection(
  reason: string,
  diagnostics: readonly string[],
  currentRevision?: number,
): string {
  const lines =
    diagnostics.length === 0
      ? [reason]
      : diagnostics.length === 1
        ? [`${reason}: ${diagnostics[0]}`]
        : [`${reason}:`, ...diagnostics.map((diagnostic) => `• ${diagnostic}`)];

  if (currentRevision !== undefined) lines.push(`current revision ${currentRevision}`);
  return lines.join("\n");
}

export function beginRequest<State extends RequestLifecycle>(
  state: State,
  command: PreparedCommand<unknown>,
): State {
  return {
    ...state,
    pendingRequest: {
      kind: command.kind,
      transportRequestId: command.context.transportRequestId,
    },
    notice: null,
  };
}

export function applyRejection<State extends RequestLifecycle>(
  state: State,
  rejection: Extract<BridgeResult<unknown>, { outcome: "rejected" }>,
): State {
  return {
    ...state,
    revision: rejection.currentRevision ?? state.revision,
    pendingRequest: null,
    requiresRefresh: rejection.currentRevision !== undefined,
    notice: describeRejection(rejection.reason, rejection.diagnostics, rejection.currentRevision),
  };
}

export function applyTransportFailure<State extends RequestLifecycle>(
  state: State,
  message: string,
): State {
  return { ...state, notice: `TRANSPORT_FAILURE: ${message}` };
}

/**
 * Fold a fresh projection into the state: adopt the engine revision and clear
 * every pending/refresh/notice marker in one place.
 */
export function applyProjection<
  State extends RequestLifecycle,
  Projection extends { readonly revision: number },
>(state: State, projection: Projection, patch: Partial<State>): State {
  return {
    ...state,
    ...patch,
    revision: projection.revision,
    pendingRequest: null,
    requiresRefresh: false,
    notice: null,
  };
}

/** Fold an accepted command result into the state: clear pending and set its notice. */
export function acceptCommand<State extends RequestLifecycle>(
  state: State,
  patch: Partial<State>,
  notice: string,
): State {
  return {
    ...state,
    ...patch,
    pendingRequest: null,
    requiresRefresh: false,
    notice,
  };
}

/** The uniform notice text both command screens show after an accepted command. */
export function commandNotice(command: {
  readonly commandId: string;
  readonly status: string;
}): string {
  return `Command ${command.commandId} is ${command.status}`;
}

let commandCounter = 0;

function createTransportRequestId(kind: RequestKind): string {
  commandCounter++;
  return `${kind}-${Date.now().toString(36)}-${commandCounter}`;
}

/**
 * Captures the command's concurrency and idempotency context exactly once.
 * Re-running this prepared command therefore retries the same transport request
 * against the same expected revision instead of accidentally issuing new work.
 */
export function prepareCommand<Value>(
  kind: RequestKind,
  expectedRevision: number,
  send: CommandSender<Value>,
  transportRequestId = createTransportRequestId(kind),
): PreparedCommand<Value> {
  return {
    kind,
    context: { expectedRevision, transportRequestId },
    send,
  };
}

/**
 * Deep command-screen module. Callers describe only the domain operation they
 * want to send. Revision capture, transport identity, pending state,
 * idempotent retry, rejection adoption, and stale-projection refresh remain
 * behind this interface.
 */
export function useCommandScreenWorkflow<
  State extends RequestLifecycle,
  Projection extends { readonly revision: number },
  Value,
>(adapter: CommandScreenAdapter<State, Projection, Value>): CommandScreenWorkflow<State, Value> {
  const [state, setState] = useState<State>(adapter.initialState);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const unresolvedCommand = useRef<PreparedCommand<Value> | null>(null);
  const activeExecution = useRef<string | null>(null);
  const loadGeneration = useRef(0);
  const adapterRef = useRef(adapter);
  const revisionRef = useRef(state.revision);
  adapterRef.current = adapter;
  revisionRef.current = state.revision;

  const loadScreen = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const current = adapterRef.current;
    try {
      const result = await current.load();
      if (generation !== loadGeneration.current) return;
      if (result.outcome !== "success") {
        setLoadError(
          describeRejection(
            result.reason,
            result.diagnostics,
            result.outcome === "rejected" ? result.currentRevision : undefined,
          ),
        );
        return;
      }
      setLoadError(null);
      setState((currentState) =>
        applyProjection(currentState, result.value, current.project(result.value)),
      );
      current.onProjection?.(result.value);
    } catch (error) {
      if (generation !== loadGeneration.current) return;
      setLoadError(
        `TRANSPORT_FAILURE: ${error instanceof Error ? error.message : "unknown transport error"}`,
      );
    }
  }, []);

  const run = useCallback(async (command: PreparedCommand<Value>) => {
    const executionId = command.context.transportRequestId;
    activeExecution.current = executionId;
    unresolvedCommand.current = command;
    setOutcomeUnknown(false);
    setState((currentState) => beginRequest(currentState, command));
    try {
      const result = await command.send(command.context);
      if (activeExecution.current !== executionId) return;
      activeExecution.current = null;
      unresolvedCommand.current = null;
      if (result.outcome === "rejected") {
        setState((currentState) => applyRejection(currentState, result));
      } else if (result.outcome === "error") {
        setOutcomeUnknown(false);
        setState((currentState) =>
          applyRejection(currentState, {
            outcome: "rejected",
            reason: result.reason,
            diagnostics: result.diagnostics,
          }),
        );
      } else {
        const { patch, notice } = adapterRef.current.accept(result.value);
        setState((currentState) => acceptCommand(currentState, patch, notice));
      }
    } catch (error) {
      if (activeExecution.current !== executionId) return;
      setOutcomeUnknown(true);
      setState((currentState) =>
        applyTransportFailure(
          currentState,
          error instanceof Error ? error.message : "unknown transport error",
        ),
      );
    }
  }, []);

  const retry = useCallback(() => {
    const command = unresolvedCommand.current;
    if (command !== null) void run(command);
  }, [run]);

  useEffect(() => {
    void loadScreen();
  }, [loadScreen]);

  useEffect(() => {
    if (state.requiresRefresh) void loadScreen();
  }, [state.requiresRefresh, loadScreen]);

  return {
    state,
    loadError,
    request: { outcomeUnknown, retry },
    loadScreen,
    execute: (kind, send) => void run(prepareCommand(kind, revisionRef.current, send)),
  };
}
