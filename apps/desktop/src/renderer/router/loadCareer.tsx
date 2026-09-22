import { useCallback, useEffect, useState } from "react";
import type { SaveId, SaveSummary } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { Trash2 } from "lucide-react";
import { describeRpcError, deleteSave, listSaves, loadSave } from "../rpc.js";
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

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const formatGameDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

const MS_PER_DAY = 86_400_000;

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MS_PER_DAY) return "Today";
  if (diff < 2 * MS_PER_DAY) return "Yesterday";
  const days = Math.floor(diff / MS_PER_DAY);
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
};

const chromeButtonClass = `flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary ${FOCUS_RING.join(" ")}`;

const SAVE_CARD =
  "rounded-panel border border-panel-border bg-panel-bg p-4 shadow-panel transition-shadow hover:shadow-panel-hover";

const INFO_LABEL = "text-xs text-text-muted";
const INFO_VALUE = "text-sm text-text-primary";

export const LoadCareerScreen = () => {
  const [saves, setSaves] = useState<ReadonlyArray<SaveSummary>>([]);
  const [listSavesError, setListSavesError] = useState<RpcClientError<"listSaves"> | null>(null);
  const [openPreferences, setOpenPreferences] = useState(false);
  const [openCredits, setOpenCredits] = useState(false);
  const [openFailure, setOpenFailure] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SaveId | null>(null);
  const [deleting, setDeleting] = useState<SaveId | null>(null);

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
    setOpenFailure(null);
    const outcome = await Effect.runPromise(loadSave(id).pipe(Effect.result));
    if (Result.isFailure(outcome)) {
      setOpenFailure(describeRpcError(outcome.failure));
      return;
    }
    navigateCareer({ type: "squad", saveId: id }, "pointer");
  };

  const handleDelete = async (id: SaveId): Promise<void> => {
    setDeleteTarget(null);
    setDeleting(id);
    await Effect.runPromise(deleteSave(id));
    setDeleting(null);
    void refresh();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === "c" || event.key === "C") && saves.length > 0) {
      event.preventDefault();
      void handleContinue(saves[0]!.id);
    }
  };

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
          className={`mx-auto w-full max-w-3xl flex-1 overflow-y-auto space-y-4 p-8 ${FOCUS_RING.join(" ")}`}
          onKeyDown={handleKeyDown}
        >
          {listSavesError && (
            <section className={PANEL}>
              <p className="text-sm text-destructive">Failed to load saves.</p>
              <Button
                type="button"
                variant="secondary"
                className="mt-2"
                data-action-id="retry-save-list"
                onClick={() => void dispatchAction("retry-save-list")}
              >
                Retry
              </Button>
            </section>
          )}

          {!listSavesError && saves.length === 0 && (
            <section className={PANEL}>
              <h2 className="text-lg font-semibold">Saved careers</h2>
              <p className="mt-2 text-sm text-text-secondary">
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

          {!listSavesError && saves.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Saved careers</h2>
              <ul className="space-y-3">
                {saves.map((entry) => (
                  <li key={entry.id} className={SAVE_CARD}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-text-primary">
                            {entry.name}
                          </h3>
                          {entry.archivedCause !== null && (
                            <Badge variant="secondary" className="shrink-0">Archived</Badge>
                          )}
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                          <div>
                            <span className={INFO_LABEL}>Manager</span>
                            <p className={INFO_VALUE}>{entry.managerName}</p>
                          </div>
                          <div>
                            <span className={INFO_LABEL}>Club</span>
                            <p className={INFO_VALUE}>{entry.userClubName}</p>
                          </div>
                          <div>
                            <span className={INFO_LABEL}>Season</span>
                            <p className={INFO_VALUE}>Season {entry.seasonNumber}{" -- "}{formatGameDate(entry.gameDate)}</p>
                          </div>
                          <div>
                            <span className={INFO_LABEL}>Created</span>
                            <p className={INFO_VALUE}>{formatDate(entry.createdAt)}</p>
                          </div>
                          <div>
                            <span className={INFO_LABEL}>Last played</span>
                            <p className={INFO_VALUE}>{timeAgo(entry.lastModifiedAt)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-1.5 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleContinue(entry.id)}
                        >
                          Continue
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={deleting === entry.id}
                          onClick={() => setDeleteTarget(entry.id)}
                        >
                          <Trash2 className="size-3.5" />
                          {deleting === entry.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {openFailure !== null && (
            <p role="alert" className="mt-2 text-sm text-destructive">{openFailure}</p>
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
                cm-clone -- a local single-player football-management simulation.
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

        {deleteTarget !== null && (
          <LightweightDialog
            title="Delete save"
            description="This save will be permanently deleted. This action cannot be undone."
            onSubmitLabel="Delete"
            onSubmit={() => void handleDelete(deleteTarget)}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </div>
    </RouteView>
  );
};
