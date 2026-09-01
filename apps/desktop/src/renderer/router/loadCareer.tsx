import { useCallback, useEffect, useState } from "react";
import { type SaveId, type SaveSummary } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { listSaves, loadSave } from "../rpc.js";
import { type RpcClientError } from "../rpc/errors.js";
import { navigate, navigateCareer } from "../navigation/adapter.js";
import { RouteView } from "./RouteView.js";
import { PANEL, CHROME_BAND } from "../theme.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";

/** The Load Career screen (`/load`): the saved-game browser the Main Menu's
 *  Load Career action opens. Lists existing Saves; an empty state offers Start
 *  New Career; a stale save entry is a silent no-op (its load validates before
 *  navigating). */
export const LoadCareerScreen = () => {
  const [saves, setSaves] = useState<ReadonlyArray<SaveSummary>>([]);
  const [listSavesError, setListSavesError] = useState<RpcClientError<"listSaves"> | null>(null);

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

  const handleContinue = async (id: SaveId): Promise<void> => {
    const outcome = await Effect.runPromise(loadSave(id).pipe(Effect.result));
    if (Result.isFailure(outcome)) return;
    navigateCareer({ type: "squad", saveId: id }, "pointer");
  };

  return (
    <RouteView screenId="loadCareer">
      <div className="min-h-screen bg-background text-foreground">
        <header className={CHROME_BAND}>
          <h1 className="truncate text-lg font-bold">Load Career</h1>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate({ type: "saveList" })}
          >
            Back
          </Button>
        </header>

        <main className="mx-auto max-w-3xl p-8">
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
                  <Button type="button" variant="secondary" className="mt-1" onClick={() => refresh()}>
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
      </div>
    </RouteView>
  );
};
