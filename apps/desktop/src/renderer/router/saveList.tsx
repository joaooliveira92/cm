import { useCallback, useEffect, useRef, useState } from "react";
import { Effect, Result } from "effect";
import { listSaves } from "../rpc.js";
import { type RpcClientError } from "../rpc/errors.js";
import { navigate } from "../navigation/adapter.js";
import { RouteView } from "./RouteView.js";
import { LightweightDialog } from "../dialog/LightweightDialog.js";
import { FOCUS_RING } from "../focus.js";
import { PANEL_STRONG } from "../theme.js";

/** The product identity — the clone's own title, not any licensed artwork. */
const PRODUCT_TITLE = "Championship Manager Clone";
const PRODUCT_SUBTITLE = "Career Simulation";

/** The vertical menu actions, in display order (spec §3.4). Each maps to a
 *  command the screen emits. Renderer-drawn — no career logic. */
const MENU_ITEMS: ReadonlyArray<{
  readonly key: string;
  readonly label: string;
  readonly command:
    | "start_new_career"
    | "open_load_game"
    | "open_preferences"
    | "open_credits"
    | "request_application_exit";
}> = [
  { key: "menu-start", label: "Start New Career", command: "start_new_career" },
  { key: "menu-load", label: "Load Career", command: "open_load_game" },
  { key: "menu-preferences", label: "Preferences", command: "open_preferences" },
  { key: "menu-credits", label: "Credits", command: "open_credits" },
  { key: "menu-exit", label: "Exit", command: "request_application_exit" },
];

/**
 * The Main Menu (`/`): the application's entry point (app-shell spec, Screen 1).
 * Full-screen, centered, with a quiet background so the vertical menu reads
 * first. Emits application commands — it never contains career logic. Keyboard
 * navigation (↑/↓/Home/End/Enter) moves the roving focus across the menu.
 */
export const SaveListScreen = () => {
  const [listSavesError, setListSavesError] = useState<RpcClientError<"listSaves"> | null>(null);
  const [openPreferences, setOpenPreferences] = useState(false);
  const [openCredits, setOpenCredits] = useState(false);
  const [openExit, setOpenExit] = useState(false);
  const menuRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const refresh = useCallback(async () => {
    setListSavesError(null);
    const outcome = await Effect.runPromise(listSaves().pipe(Effect.result));
    if (Result.isFailure(outcome)) {
      setListSavesError(outcome.failure);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Roving tabindex: exactly one menu item is the tab stop (spec §4.1).
  const [activeIndex, setActiveIndex] = useState(0);

  const focusItem = (index: number) => {
    menuRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = (activeIndex + 1) % MENU_ITEMS.length;
      setActiveIndex(next);
      focusItem(next);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prev = (activeIndex - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
      setActiveIndex(prev);
      focusItem(prev);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      focusItem(0);
    } else if (event.key === "End") {
      event.preventDefault();
      const last = MENU_ITEMS.length - 1;
      setActiveIndex(last);
      focusItem(last);
    }
  };

  const runCommand = (
    command: (typeof MENU_ITEMS)[number]["command"],
  ): void => {
    switch (command) {
      case "start_new_career":
        navigate({ type: "createLeagues" });
        break;
      case "open_load_game":
        navigate({ type: "loadCareer" });
        break;
      case "open_preferences":
        setOpenPreferences(true);
        break;
      case "open_credits":
        setOpenCredits(true);
        break;
      case "request_application_exit":
        setOpenExit(true);
        break;
    }
  };

  const handleQuitConfirmed = () => {
    setOpenExit(false);
    window.electronAPI?.showQuitGuard?.();
  };

  return (
    <RouteView screenId="saveList">
      <div className="min-h-screen bg-background text-foreground">
        <div
          className="flex min-h-screen flex-col"
          onKeyDown={handleKeyDown}
          data-focus-id="saveList.menu"
        >
          {/* Product identity area (spec §3.3) — decorative, not interactive. */}
          <header className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">{PRODUCT_TITLE}</h1>
            <p className="mt-2 text-sm uppercase tracking-widest text-text-muted">{PRODUCT_SUBTITLE}</p>
            <p className="mt-1 text-xs text-text-muted">Fictional 2003/04 dataset</p>
          </header>

          {/* Primary menu group (spec §3.4) — vertical, each row a large target. */}
          <nav
            aria-label="Main menu"
            className={`mx-auto w-full max-w-xs ${PANEL_STRONG}`}
          >
            <ul className="flex flex-col gap-1">
              {MENU_ITEMS.map((item, index) => (
                <li key={item.key}>
                  <button
                    ref={(node) => {
                      menuRefs.current[index] = node;
                    }}
                    type="button"
                    tabIndex={index === activeIndex ? 0 : -1}
                    data-focus-id={`saveList.${item.key}`}
                    aria-current={index === activeIndex ? "true" : undefined}
                    className={`w-full rounded-control px-3 py-2 text-left text-sm text-text-body transition-colors hover:bg-surface-raised hover:text-text-primary ${FOCUS_RING.join(" ")}`}
                    onClick={() => {
                      setActiveIndex(index);
                      runCommand(item.command);
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer (spec §4.2) — version separated from database version. */}
          <footer className="mt-8 flex flex-col items-center gap-1 px-4 pb-4 text-center text-xs text-text-muted">
            <span>Version 0.0.0</span>
            <span>Database: fictional 2003-style dataset · Mods: none</span>
          </footer>
        </div>

        {listSavesError && (
          <p className="sr-only" role="status">
            Failed to reach the save repository.
          </p>
        )}

        {openPreferences && (
          <LightweightDialog
            title="Preferences"
            description="Game preferences will be configurable here."
            onCancel={() => setOpenPreferences(false)}
          />
        )}

        {openCredits && (
          <LightweightDialog
            title="Credits"
            description="Championship Manager Clone — a football management simulation."
            onCancel={() => setOpenCredits(false)}
          />
        )}

        {/* Exit confirmation (spec §7): modal, default focus on Cancel, the
            destructive action styled distinctly, Escape cancels. */}
        {openExit && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpenExit(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="exit-dialog-title"
              className="w-full max-w-sm rounded-panel border border-panel-border bg-panel-bg-strong text-text-primary shadow-2xl"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setOpenExit(false);
                }
              }}
            >
              <div className="chrome-gradient flex items-center justify-between rounded-t-panel border-b border-panel-border-dark px-3 py-2 shadow-chrome">
                <h2 id="exit-dialog-title" className="font-semibold">
                  Exit application?
                </h2>
              </div>
              <div className="px-3 py-3">
                <p className="text-sm text-text-secondary">
                  Any unsaved setup changes will be lost.
                </p>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    autoFocus
                    className="rounded-control bg-surface-raised px-3 py-1 text-text-primary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setOpenExit(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-control border border-destructive/40 bg-destructive/15 px-3 py-1 text-destructive hover:bg-destructive/25"
                    onClick={handleQuitConfirmed}
                  >
                    Exit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RouteView>
  );
};
