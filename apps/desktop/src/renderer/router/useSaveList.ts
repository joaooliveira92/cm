import { useCallback, useEffect, useState } from "react";
import type { SaveSummary } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { registerActionHandler } from "../actions/dispatch.js";
import { listSaves } from "../rpc.js";

/**
 * The save repository read shared by the two pre-career screens. Both the Main Menu (which derives
 * whether a live save can be resumed) and Load Career (which lists every save) need the same probe,
 * its failure state, and the `retry-save-list` Action wired to a re-run — so the read lives here
 * rather than being spelled twice.
 *
 * `saves` keeps its previous value while a refresh is in flight, so a delete-then-reload does not
 * flash the empty state before the new list arrives. `probing` is true until the first answer lands;
 * `failed` marks an unreachable repository.
 */
export interface SaveListState {
  readonly saves: ReadonlyArray<SaveSummary>;
  readonly failed: boolean;
  readonly probing: boolean;
}

export const useSaveList = (): SaveListState & { readonly refresh: () => Promise<void> } => {
  const [state, setState] = useState<SaveListState>({
    saves: [],
    failed: false,
    probing: true,
  });

  // The state starts at `probing` and every refresh reports its answer once the read resolves.
  // Nothing is set synchronously: the effect only starts the probe, so it never triggers the
  // cascading-render failure the React Compiler rules warn about.
  const refresh = useCallback(async () => {
    const outcome = await Effect.runPromise(listSaves.pipe(Effect.result));
    setState(
      Result.isFailure(outcome)
        ? { saves: [], failed: true, probing: false }
        : { saves: outcome.success, failed: false, probing: false },
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // The retry affordance is a registered Action, not a bare onClick: the registry holds the
  // structure (`retry-save-list`, both screens' scope) and this live handler closes over the probe,
  // so the button, palette, and help overlay dispatch by the same stable id.
  useEffect(() => registerActionHandler("retry-save-list", () => void refresh()), [refresh]);

  return { ...state, refresh };
};
