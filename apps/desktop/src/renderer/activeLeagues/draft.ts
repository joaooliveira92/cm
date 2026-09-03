import type { AdvancedOptionsPayload, NationSelectionIntentPayload } from "@cm-clone/contracts";

/**
 * Draft persistence for the Active Leagues setup, as an explicit lifecycle rather than a scatter
 * of booleans and timers inside the screen.
 *
 * The standing rules the spec cites are all mechanical, so they live here where they can be
 * tested without a React tree:
 *
 * - **Debounced at the application boundary.** A burst of depth changes issues one write, not one
 *   per keystroke — the screen calls `schedule` freely and this module decides when a write goes.
 * - **Stale saves cancelled.** A newer schedule supersedes an older one: a pending timer is
 *   dropped outright, and a write already in flight has its *outcome* discarded, because the
 *   answer to a question nobody is asking any more must not become the latest saved state. (The
 *   IPC seam carries no cancellation — see `rpc/precareer.ts` — so superseding is what "cancelled"
 *   can honestly mean here, and nothing pretends otherwise by threading a dead `AbortSignal`.)
 * - **The latest successful state is identifiable.** `state()` reports the sequence number and the
 *   payload of the last write that actually landed, so a caller can tell "saved" from "saved
 *   something older".
 * - **Pending work is flushed or cancelled on deterministic disposal.** `dispose()` writes the
 *   outstanding payload and then refuses further work, so leaving the screen never loses the edit
 *   that was still inside the debounce window.
 *
 * The fingerprint binding is not enforced here: the main process stamps every draft with the live
 * catalogue fingerprint on write and discards a mismatched draft on read, which keeps that
 * decision in the one place it cannot be got wrong (`main/leagueSelection.ts`).
 */

export interface DraftPayload {
  readonly intents: readonly NationSelectionIntentPayload[];
  readonly advancedOptions: AdvancedOptionsPayload;
}

/** The write's outcome as a value. `Failure` carries a readable message, never a stack trace. */
export type DraftSaveState =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Pending"; readonly sequence: number }
  | {
      readonly _tag: "Success";
      readonly sequence: number;
      readonly payload: DraftPayload;
    }
  | { readonly _tag: "Failure"; readonly sequence: number; readonly message: string };

export const IDLE_DRAFT_STATE: DraftSaveState = { _tag: "Idle" };

/** Long enough that a burst of edits settles into one write, short enough that leaving the screen
 *  a moment later has nothing meaningful left to flush. */
export const DRAFT_SAVE_DEBOUNCE_MS = 400;

export interface DraftSaver {
  /** Record a new draft to write. Supersedes anything scheduled and anything in flight. */
  readonly schedule: (payload: DraftPayload) => void;
  /** Write the outstanding payload now, if any, and settle. Safe to call with nothing pending. */
  readonly flush: () => Promise<void>;
  /** Flush, then refuse further work. Idempotent — a second call is a no-op. */
  readonly dispose: () => Promise<void>;
  readonly state: () => DraftSaveState;
}

export interface DraftSaverOptions {
  /** The write itself. Resolves to `null` on success, or to a readable failure message. */
  readonly save: (payload: DraftPayload) => Promise<string | null>;
  readonly delayMs?: number;
  readonly onStateChange?: (state: DraftSaveState) => void;
}

export const createDraftSaver = ({
  save,
  delayMs = DRAFT_SAVE_DEBOUNCE_MS,
  onStateChange,
}: DraftSaverOptions): DraftSaver => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingPayload: DraftPayload | null = null;
  let inFlight: Promise<void> | null = null;
  let sequence = 0;
  /** The newest sequence anybody has started. An older write settling against a newer number is
   *  the superseded case, and its outcome is dropped rather than published. */
  let newestStarted = 0;
  let disposed = false;
  let state: DraftSaveState = IDLE_DRAFT_STATE;

  const publish = (next: DraftSaveState): void => {
    state = next;
    onStateChange?.(next);
  };

  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const run = async (payload: DraftPayload): Promise<void> => {
    sequence += 1;
    const mine = sequence;
    newestStarted = mine;
    publish({ _tag: "Pending", sequence: mine });

    const message = await save(payload);

    // Superseded: a newer write started while this one was in flight, so its answer says nothing
    // about the current draft and must not become the latest saved state.
    if (mine !== newestStarted) return;

    publish(
      message === null
        ? { _tag: "Success", sequence: mine, payload }
        : { _tag: "Failure", sequence: mine, message },
    );
  };

  const start = (payload: DraftPayload): Promise<void> => {
    const promise = run(payload).finally(() => {
      if (inFlight === promise) inFlight = null;
    });
    inFlight = promise;
    return promise;
  };

  const flush = async (): Promise<void> => {
    clearTimer();
    const payload = pendingPayload;
    pendingPayload = null;
    if (payload !== null) {
      await start(payload);
      return;
    }
    if (inFlight !== null) await inFlight;
  };

  return {
    schedule: (payload) => {
      if (disposed) return;
      pendingPayload = payload;
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        const next = pendingPayload;
        pendingPayload = null;
        if (next !== null) void start(next);
      }, delayMs);
    },
    flush,
    dispose: async () => {
      if (disposed) return;
      disposed = true;
      await flush();
    },
    state: () => state,
  };
};
