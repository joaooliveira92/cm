import { useCallback, useEffect, useState } from "react";
import type { SaveId, SaveSummary } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { listSaves, loadSave } from "../rpc.js";
import { dispatchAction, registerActionHandler } from "../actions/dispatch.js";
import type { RpcClientError } from "../rpc/errors.js";
import { navigate, navigateCareer } from "../navigation/adapter.js";
import { RouteView } from "./RouteView.js";
import { PANEL } from "../theme.js";
import { FOCUS_RING } from "../focus.js";
import { Header } from "../chrome/header/index.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { LightweightDialog } from "../dialog/LightweightDialog.js";

export const LoadCareerScreen = () => {
  const [saves, setSaves] = useState<ReadonlyArray<SaveSummary>>([]);
  const [listSavesError, setListSavesError] = useState<RpcClientError<"listSaves"> | null>(null);
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
    void refresh();
  }, [refresh]);

  useEffect(() => registerActionHandler("retry-save-list", () => void refresh()), [refresh]);

  const handleContinue = async (id: SaveId): Promise<void> => {
    const outcome = await Effect.runPromise(loadSave(id).pipe(Effect.result));
    if (Result.isFailure(outcome)) return;
    navigateCareer({ type: "squad", saveId: id }, "pointer");
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // C to continue on the most-recent save (keyboard tier Level 2).
    if ((event.key === "c" || event.key === "C") && saves.length > 0) {
      event.preventDefault();
      void handleContinue(saves[0]!.id);
    }
  };

  const chromeButtonClass = `flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary ${FOCUS_RING.join(" ")}`;

  return (
    <RouteView screenId="loadCareer">
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <Header.Shell
          title="Load Career"
          state={{ view: "load" }}
          actions={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigate({ type: "mainMenu" })}
            >
              Back
            </Button>
          }
        />

        {/* App-chrome bar (ticket 04): Preferences, Credits, Quit — icon-only
            lightweight actions matching the Retire and Quit confirmation patterns. */}
        <div className="flex items-center justify-end gap-2 px-4 pt-1">
          <button
            type="button"
            className={chromeButtonClass}
            onClick={() => setOpenPreferences(true)}
          >
            Preferences
          </button>
          <button
            type="button"
            className={chromeButtonClass}
            onClick={() => setOpenCredits(true)}
          >
            Credits
          </button>
          <button
            type="button"
            className={chromeButtonClass}
            onClick={() => window.electronAPI.quitApplication()}
          >
            Quit
          </button>
        </div>

        <main
          tabIndex={-1}
          data-focus-id="loadCareer"
          aria-label="Load Career"
          className={`mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-8 ${FOCUS_RING.join(" ")}`}
          onKeyDown={handleKeyDown}
        >
          <section className={PANEL}>
            <h2 className="text-lg font-semibold">Saved careers</h2>
            <ul className="mt-2 space-y-1">
              {saves.map((save) => (
                <li
                  key={save.id}
                  className="flex items-baseline gap-2"
                  tabIndex={save.id === saves[0]?.id ? 0 : -1}
                  role="button"
                  aria-label={`Save ${save.name}`}
                  onClick={() => void handleContinue(save.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleContinue(save.id);
                  }}
                >
                  <span className="text-text-primary underline hover:text-text-body">{save.name}</span>
                  {save.archivedCause !== null && <Badge variant="secondary">Archived</Badge>}
                </li>
              ))}
              {saves.length === 0 && !listSavesError && (
                <li className="text-text-muted">No saves yet.</li>
              )}
              {listSavesError && (
                <div className="mt-2">
                  <p className="text-sm text-destructive">Failed to load saves.</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-1"
                    data-action-id="retry-save-list"
                    onClick={() => void dispatchAction("retry-save-list")}
                  >
                    Retry
                  </Button>
                </div>
              )}
            </ul>
          </section>

          {saves.length === 0 && !listSavesError && (
            <section className={`${PANEL} mt-4`}>
              <p className="text-sm text-text-secondary">
                No saves yet. Start a new career to begin managing.
              </p>
              <Button
                type="button"
                className="mt-3"
                onClick={() => navigate({ type: "createLeagues" })}
              >
                Start New Career
              </Button>
            </section>
          )}
        </main>

        {openPreferences && (
          <LightweightDialog
            title="Preferences"
            description="Application preferences are not built yet. They will apply with no career loaded."
            onCancel={() => setOpenPreferences(false)}
          />
        )}

        {openCredits && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="mx-4 max-w-md rounded-panel bg-panel-bg p-6 shadow-panel">
              <h2 className="text-lg font-semibold">Credits</h2>
              <p className="mt-2 text-sm text-text-body">
                cm-clone — a local single-player football-management simulation.
              </p>
              <p className="mt-2 text-sm text-text-body">
                Built with Electron, React, Effect, and TypeScript.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                onClick={() => setOpenCredits(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </RouteView>
  );
};