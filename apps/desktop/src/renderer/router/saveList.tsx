import { useCallback, useEffect, useState } from "react";
import { type SaveId, type SaveSummary } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { listSaves, loadSave, ping } from "../rpc.js";
import { navigate, navigateCareer } from "../navigation/adapter.js";
import { RouteView } from "./RouteView.js";

/** The save list route (`/`): the app's boot screen. Continue opens the active
 *  career; Start New Career enters the creation flow. A stale save entry is a
 *  silent no-op (its load validates before navigating). */
export const SaveListScreen = () => {
  const [saves, setSaves] = useState<ReadonlyArray<SaveSummary>>([]);
  const [status, setStatus] = useState("connecting...");

  const refresh = useCallback(async () => {
    const outcome = await Effect.runPromise(listSaves().pipe(Effect.result));
    if (Result.isFailure(outcome)) return;
    setSaves(outcome.success);
  }, []);

  useEffect(() => {
    const connect = async () => {
      const pinged = await Effect.runPromise(ping().pipe(Effect.result));
      setStatus(
        Result.isSuccess(pinged)
          ? `main process says: ${pinged.success}`
          : "failed to reach main process",
      );
      await refresh();
    };
    void connect();
  }, [refresh]);

  const handleContinue = async (id: SaveId): Promise<void> => {
    const outcome = await Effect.runPromise(loadSave(id).pipe(Effect.result));
    if (Result.isFailure(outcome)) return;
    navigateCareer({ type: "squad", saveId: id }, "pointer");
  };

  return (
    <RouteView screenId="saveList">
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <h1 className="text-2xl font-bold">Championship Manager Clone</h1>
        <p className="mt-1 text-sm text-slate-400">{status}</p>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">Continue career</h2>
          <ul className="mt-2 space-y-1">
            {saves.map((save) => (
              <li key={save.id}>
                <button
                  type="button"
                  className="text-slate-100 underline hover:text-slate-300"
                  onClick={() => void handleContinue(save.id)}
                >
                  {save.name}
                </button>
              </li>
            ))}
            {saves.length === 0 && <li className="text-slate-500">No saves yet.</li>}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">New career</h2>
          <p className="mt-2 text-sm text-slate-400">
            Click below to start a new career with manager profile selection.
          </p>
          <button
            type="button"
            className="mt-3 rounded bg-slate-700 px-4 py-2 hover:bg-slate-600"
            onClick={() => navigate({ type: "createStep1" })}
          >
            Start New Career
          </button>
        </section>
      </main>
    </RouteView>
  );
};