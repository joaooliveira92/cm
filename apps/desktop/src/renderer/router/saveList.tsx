import { useCallback, useEffect, useState } from "react";
import { Info, LogOut, Settings } from "lucide-react";
import { type SaveId, type SaveSummary } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { listSaves, loadSave, ping } from "../rpc.js";
import { type RpcClientError } from "../rpc/errors.js";
import { navigate, navigateCareer } from "../navigation/adapter.js";
import { RouteView } from "./RouteView.js";
import { LightweightDialog } from "../dialog/LightweightDialog.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Kbd } from "../components/ui/kbd.js";

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
      <main className="min-h-screen bg-background p-8 text-foreground">
        <h1 className="text-2xl font-bold">Championship Manager Clone</h1>
        <p className="mt-1 text-sm text-text-secondary">{status}</p>

        {/* App-chrome bar — three icon-only buttons matching Retire and Quit patterns. The
            glyphs come from `lucide-react`; the hand-drawn paths they replaced were malformed. */}
        <nav className="mb-6 flex items-center justify-between border-b border-border-subtle p-2 text-sm">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handlePreferences}
              aria-label="Preferences"
            >
              <Settings aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCredits}
              aria-label="Credits"
            >
              <Info aria-hidden="true" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="icon" onClick={handleQuit} aria-label="Quit">
              <LogOut aria-hidden="true" />
            </Button>
          </div>
        </nav>

        {/* Keyboard navigation hint (Level 2 tier) */}
        <div className="mb-2 text-xs text-text-secondary">
          Level 2: Use ↑↓ to navigate, <Kbd>Enter</Kbd> to select, <Kbd>C</Kbd> to continue most
          recent
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
                <span className="text-text-primary underline hover:text-text-body">{save.name}</span>
                {/* An Archived Save still opens — it is read-only, not gone — so the marker sits
                    beside the entry rather than replacing it. Both causes read the same here; only
                    Season Summary distinguishes them. */}
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

        <section className="mt-6">
          <h2 className="text-lg font-semibold">New career</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Click below to start a new career with manager profile selection.
          </p>
          <Button type="button" className="mt-3" onClick={() => navigate({ type: "createLeagues" })}>
            Start New Career
          </Button>
        </section>
      </main>
    </RouteView>
  );
};