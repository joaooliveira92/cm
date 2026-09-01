import { useCallback, useEffect, useRef, useState } from "react";
import { Effect, Result } from "effect";
import { listSaves } from "../rpc.js";
import { navigate } from "../navigation/adapter.js";
import { RouteView } from "./RouteView.js";
import { LightweightDialog } from "../dialog/LightweightDialog.js";
import { Button } from "../components/ui/button.js";
import {
  MODAL_BODY,
  MODAL_COMPACT,
  MODAL_SCRIM,
  MODAL_TITLE_BAND,
  PANEL,
  PANEL_STRONG,
} from "../theme.js";

/** The product identity (spec §3.3) — the clone's own title, no licensed artwork. */
const PRODUCT_TITLE = "Championship Manager Clone";
const PRODUCT_SUBTITLE = "Career Simulation";

/**
 * The application version and the football-database edition are separate lines
 * because they move independently (spec §4.2). `APP_VERSION` tracks the
 * desktop package's `version` field.
 */
const APP_VERSION = "0.0.0";
const DATABASE_EDITION = "Fictional 2003/04 dataset";

/** The commands this screen emits (spec §9). It holds no career logic: each
 *  case either navigates or opens a local layer. */
type MenuCommand =
  | "start_new_career"
  | "open_load_game"
  | "open_preferences"
  | "open_credits"
  | "request_application_exit";

/** The vertical menu, in display order (spec §3.4). */
const MENU_ITEMS: ReadonlyArray<{
  readonly key: string;
  readonly label: string;
  readonly command: MenuCommand;
}> = [
  { key: "menu-start", label: "Start New Career", command: "start_new_career" },
  { key: "menu-load", label: "Load Career", command: "open_load_game" },
  { key: "menu-preferences", label: "Preferences", command: "open_preferences" },
  { key: "menu-credits", label: "Credits", command: "open_credits" },
  { key: "menu-exit", label: "Exit", command: "request_application_exit" },
];

/**
 * How the save repository answered the menu's probe (spec §8 `hasSavedGames`,
 * §10.1 repository unavailable). Derived on mount rather than stored: the menu
 * asks the repository, it does not keep a Boolean of its own.
 */
type SaveRepositoryState =
  | { readonly status: "probing" }
  | { readonly status: "ready"; readonly hasSavedGames: boolean }
  | { readonly status: "unavailable" };

/**
 * The Main Menu (`/`): the application's entry point (app-shell spec, Screen 1).
 * Full-screen and centered, with a quiet background so the vertical menu reads
 * first. It emits application commands and never touches career state.
 *
 * Keyboard: ↑/↓ move the roving focus, Home/End jump to the ends, Enter
 * activates through the native button. Focus does not wrap — wrapping is an
 * accessibility preference this app has no surface for yet, and the spec makes
 * it opt-in.
 *
 * The saved-game browser is not here: `Load Career` navigates to `/load`, which
 * owns the list, its empty state, and its errors.
 */
export const MainMenuScreen = () => {
  const [repository, setRepository] = useState<SaveRepositoryState>({ status: "probing" });
  const [openPreferences, setOpenPreferences] = useState(false);
  const [openCredits, setOpenCredits] = useState(false);
  const [openExit, setOpenExit] = useState(false);
  const menuRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const probeSaveRepository = useCallback(async () => {
    setRepository({ status: "probing" });
    const outcome = await Effect.runPromise(listSaves().pipe(Effect.result));
    setRepository(
      Result.isFailure(outcome)
        ? { status: "unavailable" }
        : { status: "ready", hasSavedGames: outcome.success.length > 0 },
    );
  }, []);

  useEffect(() => {
    void probeSaveRepository();
  }, [probeSaveRepository]);

  // Roving tabindex: exactly one menu item is the tab stop (spec §4.1).
  const [activeIndex, setActiveIndex] = useState(0);

  const focusItem = (index: number) => {
    setActiveIndex(index);
    menuRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const last = MENU_ITEMS.length - 1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(Math.min(activeIndex + 1, last));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(Math.max(activeIndex - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusItem(last);
    }
  };

  const runCommand = (command: MenuCommand): void => {
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

  /** The one piece of repository-derived state the menu shows: a text hint, not
   *  a disabled control. `Load Career` stays enabled with no saves, because the
   *  spec puts that empty state on the load screen (§5.2). */
  const loadHint =
    repository.status === "ready" && !repository.hasSavedGames ? "No saved careers yet" : null;

  return (
    <RouteView screenId="mainMenu">
      <div className="min-h-screen bg-background text-foreground">
        <div
          className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 lg:px-12"
          onKeyDown={handleKeyDown}
          data-focus-id="mainMenu.menu"
        >
          {/* Product identity area (spec §3.3) — decorative, not interactive. */}
          <header className="flex flex-col items-center justify-end pt-16 pb-10 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">{PRODUCT_TITLE}</h1>
            <p className="mt-2 text-sm tracking-widest text-text-muted uppercase">
              {PRODUCT_SUBTITLE}
            </p>
            <p className="mt-1 text-xs text-text-muted">{DATABASE_EDITION}</p>
          </header>

          {/* Primary menu group (spec §3.4) — vertical, each row a large target. */}
          <nav aria-label="Main menu" className={`mx-auto w-full max-w-xs ${PANEL_STRONG}`}>
            <ul className="flex flex-col gap-1">
              {MENU_ITEMS.map((item, index) => (
                <li key={item.key}>
                  <Button
                    ref={(node) => {
                      menuRefs.current[index] = node;
                    }}
                    type="button"
                    variant="ghost"
                    size="lg"
                    tabIndex={index === activeIndex ? 0 : -1}
                    data-focus-id={`mainMenu.${item.key}`}
                    aria-describedby={
                      item.command === "open_load_game" && loadHint !== null
                        ? "menu-load-hint"
                        : undefined
                    }
                    className="w-full justify-start active:bg-surface"
                    onFocus={() => setActiveIndex(index)}
                    onClick={() => {
                      setActiveIndex(index);
                      runCommand(item.command);
                    }}
                  >
                    {item.label}
                  </Button>
                </li>
              ))}
            </ul>
            {/* The hint sits outside the control so it describes `Load Career`
                without becoming part of its accessible name. */}
            {loadHint !== null && (
              <p id="menu-load-hint" className="mt-2 px-3 text-2xs text-text-muted">
                {loadHint}
              </p>
            )}
          </nav>

          {/* Save repository unavailable (spec §10.1): explained, retryable, and
              nonblocking — every menu item above stays usable. */}
          {repository.status === "unavailable" && (
            <div
              role="status"
              className={`mx-auto mt-4 w-full max-w-xs ${PANEL} flex items-center justify-between gap-3`}
            >
              <p className="text-xs text-destructive">
                Saved careers could not be read. Starting a new career still works.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void probeSaveRepository()}
              >
                Retry
              </Button>
            </div>
          )}

          <div className="flex-1" />

          {/* Footer (spec §4.2) — application version kept distinct from the
              database edition, both low-emphasis, never over the menu. */}
          <footer className="flex flex-col items-center gap-1 px-4 pt-8 pb-4 text-center text-xs text-text-muted">
            <span>Version {APP_VERSION}</span>
            <span>Database: {DATABASE_EDITION} · Mods: none</span>
          </footer>
        </div>

        {openPreferences && (
          <LightweightDialog
            title="Preferences"
            description="Application preferences are not built yet. They will apply with no career loaded."
            onCancel={() => setOpenPreferences(false)}
          />
        )}

        {/* Credits (spec §5.4): informational, scrollable, with a Back action. */}
        {openCredits && (
          <div
            className={MODAL_SCRIM}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpenCredits(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Credits"
              className={MODAL_COMPACT}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setOpenCredits(false);
                }
              }}
            >
              <div className={MODAL_TITLE_BAND}>
                <h2 className="font-semibold">Credits</h2>
              </div>
              <div className={MODAL_BODY}>
                <div className="max-h-64 overflow-y-auto text-sm text-text-secondary">
                  <p>{PRODUCT_TITLE} — an original football management simulation.</p>
                  <p className="mt-2">
                    Every club, competition, and person in this game is fictional. No licensed
                    imagery, database, or interface text from any other game is used.
                  </p>
                  <p className="mt-2">Built with Electron, React, and Effect.</p>
                </div>
                <div className="mt-4 flex items-center justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    autoFocus
                    onClick={() => setOpenCredits(false)}
                  >
                    Back
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Exit confirmation (spec §7): modal, default focus on Cancel, the
            destructive action styled distinctly, Escape cancels. No career is
            loaded here, so it must not warn about losing career progress. */}
        {openExit && (
          <div
            className={MODAL_SCRIM}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpenExit(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Exit application?"
              className={MODAL_COMPACT}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setOpenExit(false);
                }
              }}
            >
              <div className={MODAL_TITLE_BAND}>
                <h2 className="font-semibold">Exit application?</h2>
              </div>
              <div className={MODAL_BODY}>
                <p className="text-sm text-text-secondary">
                  No career is loaded, so nothing will be lost.
                </p>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button type="button" variant="secondary" autoFocus onClick={() => setOpenExit(false)}>
                    Cancel
                  </Button>
                  <Button type="button" variant="destructive" onClick={handleQuitConfirmed}>
                    Exit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RouteView>
  );
};
