import { useCallback, useEffect, useState } from "react";
import { type SaveId, type SaveSummary } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { listSaves, loadSave, ping } from "../rpc.js";
import { type RpcClientError } from "../rpc/errors.js";
import { navigate, navigateCareer } from "../navigation/adapter.js";
import { RouteView } from "./RouteView.js";
import { LightweightDialog } from "../dialog/LightweightDialog.js";

/** The save list route (`/`): the app's boot screen. Continue opens the active
 *  career; Start New Career enters the creation flow. A stale save entry is a
 *  silent no-op (its load validates before navigating). */
export const SaveListScreen = () => {
  const [saves, setSaves] = useState<ReadonlyArray<SaveSummary>>([]);
  const [listSavesError, setListSavesError] = useState<RpcClientError<"listSaves"> | null>(null);
  const [status, setStatus] = useState("connecting...");
  const [openPreferences, setOpenPreferences] = useState(false);
  const [openCredits, setOpenCredits] = useState(false);

  const refresh = useCallback(async () => {
    setListSavesError(null);
    const outcome = await Effect.runPromise(listSaves().pipe(Effect.result));
    if (Result.isFailure(outcome)) {
      setListSavesError(outcome.failure);
      return;
    }
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

  const handleQuit = () => {
    // Trigger the before-quit guard from Ticket 03
    window.electronAPI?.showQuitGuard?.();
  };

  const handlePreferences = () => setOpenPreferences(true);
  const handleCredits = () => setOpenCredits(true);

  return (
    <RouteView screenId="saveList">
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <h1 className="text-2xl font-bold">Championship Manager Clone</h1>
        <p className="mt-1 text-sm text-slate-400">{status}</p>

        {/* App-chrome bar — three icon-only buttons matching Retire and Quit patterns */}
        <nav className="flex items-center justify-between mb-6 border-b border-slate-800 bg-slate-950 p-2 text-sm text-slate-100">
          <div className="flex gap-2">
            {/* Preferences button */}
            <button
              type="button"
              className="p-1 rounded.bg-slate-800 hover:bg-slate-700 transition-colors"
              onClick={handlePreferences}
              aria-label="Preferences"
            >
              <svg
                className="w-4 h-4 text-slate-300"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm0 2c3.866 0 7 3.134 7 7s-3.134 7-7 7S2 12.866 2 9 5.134 2 5 2s3.134 7 7 7Zm0-2c-2.209 0-4 1.791-4 4v2h8v-2c0-2.209-1.791-4-4-4Zm0 5.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5c0-1.38-1.12-2.5-2.5-2.5Z"/>
              </svg>
            </button>

            {/* Credits button */}
            <button
              type="button"
              className="p-1 rounded.bg-slate-800 hover:bg-slate-700 transition-colors"
              onClick={handleCredits}
              aria-label="Credits"
            >
              <svg
                className="w-4 h-4 text-slate-300"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2c-5.523 0-10 4.477-10 10s5.523 10 10 10 10-4.477 10-10S17.523 2 12 2ZM12 4.1L9 4.1c-1.66 0-3 1.34-3 3v8c0 1.66 1.34 3 3 3h6c1.66 0 3-1.34 3-3v-2.9L12 4.1Zm0 16.6c-2.318 0-4.2-1.882-4.2-4.2s1.882-4.2 4.2-4.2 4.2 1.882 4.2 4.2-1.882 4.2-4.2 4.2Zm0-5.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5c0-1.38-1.12-2.5-2.5-2.5Z"/>
              </svg>
            </button>
          </div>
          <div className="flex gap-2">
            {/* Quit button */}
            <button
              type="button"
              className="p-1 rounded.bg-slate-800 hover:bg-slate-700 transition-colors"
              onClick={handleQuit}
              aria-label="Quit"
            >
              <svg
                className="w-4 h-4 text-slate-300"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M6 2L6 6V19c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V8l-2-4H8c-1.1 0-2 .9-2 2v8l4 4h2c1.1 0 2-.9 2-2V8l-2-4H6ZM19 6l-8.5 4.5L14 21l4.5-8.5L19 6ZM4 4h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v-H4Z"/>
              </svg>
            </button>
          </div>
        </nav>

        {/* Keyboard navigation hint (Level 2 tier) */}
        <div className="text-xs text-slate-400 mb-2">
          Level 2: Use ↑↓ to navigate, <kbd className="bg-slate-800 px-1 py-0.5 rounded">Enter</kbd> to select, <kbd className="bg-slate-800 px-1 py-0.5 rounded">C</kbd> to continue most recent
        </div>

        {/* Preferences dialog */}
        {openPreferences && (
          <LightweightDialog
            title="Preferences"
            description="Game preferences will be configurable here."
            onCancel={() => setOpenPreferences(false)}
          />
        )}

        {/* Credits dialog */}
        {openCredits && (
          <LightweightDialog
            title="Credits"
            description="Championship Manager Clone — a football management simulation."
            onCancel={() => setOpenCredits(false)}
          />
        )}

        <section className="mt-6">
          <h2 className="text-lg font-semibold">Continue career</h2>
          <ul className="mt-2 space-y-1">
            {saves.map((save) => (
              <li
                key={save.id}
                className="flex items-baseline gap-2"
                tabIndex={save.id === saves[0]?.id ? 0 : -1}
                role="button"
                aria-label={`Save ${save.name}`}
                onClick={() => void handleContinue(save.id)}
              >
                <span className="text-slate-100 hover:text-slate-300 underline">
                  {save.name}
                </span>
                {/* An Archived Save still opens — it is read-only, not gone — so the marker sits
                    beside the entry rather than replacing it. Both causes read the same here; only
                    Season Summary distinguishes them. */}
                {save.archivedCause !== null && (
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                    Archived
                  </span>
                )}
              </li>
            ))}
            {saves.length === 0 && !listSavesError && <li className="text-slate-500">No saves yet.</li>}
            {listSavesError && (
              <div className="mt-2">
                <p className="text-red-500 text-sm">Failed to load saves.</p>
                <button
                  type="button"
                  className="mt-1 px-3 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100"
                  onClick={() => refresh()}
                >
                  Retry
                </button>
              </div>
            )}
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