import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveSummary } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { describeRpcError, listSaves, loadSave } from "../rpc.js";
import { dispatchAction, registerActionHandler } from "../actions/dispatch.js";
import { navigate, navigateCareer } from "../navigation/adapter.js";
import { RouteView } from "./RouteView.js";
import { Header } from "../chrome/header/index.js";
import { ShellBottomBar, EMPTY_BOTTOM_BAR } from "../chrome/bottom-bar/index.js";
import { PreferencesDialog } from "../appearance/PreferencesDialog.js";
import { Button } from "../components/ui/button.js";
import {
  PANEL,
  PANEL_STRONG,
} from "../theme.js";
import { Backdrop } from "../backdrop/Backdrop.js";
import { Dialog } from "../components/shared/Dialog.js";
import { MENU_BACKDROP } from "../backdrop/backdrops.js";
import { APP_VERSION, DATABASE_EDITION } from "../appInfo.js";

/** The product identity (spec §3.3) — the clone's own title, no licensed artwork. */
const PRODUCT_TITLE = "Championship Manager Clone";
const PRODUCT_SUBTITLE = "Career Simulation";


/** The commands this screen emits (spec §9). It holds no career logic: each
 *  case either navigates or opens a local layer. */
type MenuCommand =
  | "start_new_career"
  | "resume_last_career"
  | "open_load_game"
  | "open_preferences"
  | "open_credits"
  | "request_application_exit";

type MenuItem = {
  readonly key: string;
  readonly label: string;
  readonly command: MenuCommand;
  /** The sentence beside the button. It describes the button rather than
   *  naming it, so it is wired through `aria-describedby`. */
  readonly description: string;
};

const START_ITEM: MenuItem = {
  key: "menu-start",
  label: "Start New Career",
  command: "start_new_career",
  description: "Choose this option to pick your leagues, create your manager, and take charge of a club.",
};

/** The remaining items, in display order (spec §3.4). `Resume Last Career`
 *  slots in after `Start New Career` when there is a live save to resume. */
const FIXED_ITEMS: ReadonlyArray<MenuItem> = [
  {
    key: "menu-load",
    label: "Load Career",
    command: "open_load_game",
    description: "Choose this option to open any saved career, or delete the ones you no longer need.",
  },
  {
    key: "menu-preferences",
    label: "Preferences",
    command: "open_preferences",
    description: "Choose this option to change how the game looks and behaves.",
  },
  {
    key: "menu-credits",
    label: "Credits",
    command: "open_credits",
    description: "Choose this option to see who made this game and what it is built with.",
  },
  {
    key: "menu-exit",
    label: "Exit",
    command: "request_application_exit",
    description: "Choose this option to close the game and return to the real world.",
  },
];

/** The live save the player touched last, or `null`. Archived saves are a
 *  finished career, so there is nothing to resume in them. ISO timestamps
 *  order correctly as plain strings. */
const latestLiveSave = (saves: ReadonlyArray<SaveSummary>): SaveSummary | null => {
  let latest: SaveSummary | null = null;
  for (const save of saves) {
    if (save.archivedCause !== null) continue;
    if (latest === null || save.lastModifiedAt > latest.lastModifiedAt) latest = save;
  }
  return latest;
};

const menuItems = (resumable: SaveSummary | null): ReadonlyArray<MenuItem> =>
  resumable === null
    ? [START_ITEM, ...FIXED_ITEMS]
    : [
      START_ITEM,
      {
        key: "menu-resume",
        label: "Resume Last Career",
        command: "resume_last_career",
        description: `Choose this option to resume the career you played most recently ('${resumable.name}', ${resumable.userClubName}).`,
      },
      ...FIXED_ITEMS,
    ];

/**
 * How the save repository answered the menu's probe (spec §8 `hasSavedGames`,
 * §10.1 repository unavailable). Derived on mount rather than stored: the menu
 * asks the repository, it does not keep a Boolean of its own.
 */
type SaveRepositoryState =
  | { readonly status: "probing" }
  | {
    readonly status: "ready";
    readonly hasSavedGames: boolean;
    readonly resumable: SaveSummary | null;
  }
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
  const [resumeFailure, setResumeFailure] = useState<string | null>(null);
  const menuRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const probeSaveRepository = useCallback(async () => {
    setRepository({ status: "probing" });
    const outcome = await Effect.runPromise(listSaves.pipe(Effect.result));
    setRepository(
      Result.isFailure(outcome)
        ? { status: "unavailable" }
        : {
          status: "ready",
          hasSavedGames: outcome.success.length > 0,
          resumable: latestLiveSave(outcome.success),
        },
    );
  }, []);

  useEffect(() => {
    void probeSaveRepository();
  }, [probeSaveRepository]);

  // The retry affordance is a registered Action, not a bare onClick: the
  // registry holds the structure (`retry-save-list`, mainMenu scope) and this
  // live handler closes over the probe, so the button, palette, and help
  // overlay dispatch by the same stable id (ADR-0012).
  useEffect(() => registerActionHandler("retry-save-list", () => void probeSaveRepository()), [
    probeSaveRepository,
  ]);

  const resumable = repository.status === "ready" ? repository.resumable : null;
  const items = menuItems(resumable);

  // Roving tabindex: exactly one menu item is the tab stop (spec §4.1).
  const [activeIndex, setActiveIndex] = useState(0);

  const focusItem = (index: number) => {
    setActiveIndex(index);
    menuRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const last = items.length - 1;
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

  /** Opens the save the same way the Load screen's Continue does. */
  const resumeLastCareer = async (save: SaveSummary): Promise<void> => {
    setResumeFailure(null);
    const outcome = await Effect.runPromise(loadSave(save.id).pipe(Effect.result));
    if (Result.isFailure(outcome)) {
      setResumeFailure(describeRpcError(outcome.failure));
      return;
    }
    navigateCareer({ type: "squad", saveId: save.id }, "pointer");
  };

  const runCommand = (command: MenuCommand): void => {
    switch (command) {
      case "start_new_career":
        navigate({ type: "createLeagues" });
        break;
      case "resume_last_career":
        if (resumable !== null) void resumeLastCareer(resumable);
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
    if (window.electronAPI.platform === "darwin") {
      // On macOS the last window close does not quit the app (standard Cocoa
      // convention), so ask the main process to quit directly.
      window.electronAPI.quitApplication();
    } else {
      // On non-macOS closing the window triggers `before-quit`. The quit guard
      // prevents it, shows the dialog, and on confirmation calls `app.quit()`.
      window.close();
    }
  };

  /** The one piece of repository-derived state the menu shows: a text hint, not
   *  a disabled control. `Load Career` stays enabled with no saves, because the
   *  spec puts that empty state on the load screen (§5.2). */
  const loadHint =
    repository.status === "ready" && !repository.hasSavedGames ? "No saved careers yet" : null;

  return (
    <RouteView screenId="mainMenu">
      <div className="relative isolate flex h-screen flex-col overflow-hidden text-foreground">
        <Backdrop src={MENU_BACKDROP} />
        {/* The menu's identity block below is the page heading; the band only
            names the window. */}
        <Header.Shell title={PRODUCT_TITLE} titleAsHeading={false} state={{ view: "menu" }} />

        <div
          className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-y-auto px-6 lg:px-12"
          onKeyDown={handleKeyDown}
          data-focus-id="mainMenu.menu"
        >
          {/* Product identity area (spec §3.3) — decorative, not interactive. */}
          <header className="flex flex-col items-center justify-end pt-12 pb-6 text-center">
            <h1 className="text-display text-text-primary">{PRODUCT_TITLE}</h1>
            <p className="mt-2 text-body tracking-widest text-text-muted uppercase">
              {PRODUCT_SUBTITLE}
            </p>

          </header>

          {/* Primary menu group (spec §3.4) — vertical, each row a large target
              with a sentence beside it saying what it does. Exit stands apart
              at the foot of the list. */}
          <nav aria-label="Main menu" className={`w-full ${PANEL_STRONG}`}>
            <ul className="flex flex-col gap-3">
              {items.map((item, index) => {
                const descriptionId = `${item.key}-description`;
                const describedBy =
                  item.command === "open_load_game" && loadHint !== null
                    ? `${descriptionId} menu-load-hint`
                    : descriptionId;
                return (
                  <li
                    key={item.key}
                    style={{ animationDelay: `${index * 0.08}s` }}
                    className={`grid grid-cols-[minmax(10rem,14rem)_1fr] items-center gap-6 motion-reduce:animate-none animate-[menu-fade-in_0.3s_ease-out_both] ${item.command === "request_application_exit" ? "mt-8" : ""
                      }`}
                  >
                    <Button
                      ref={(node) => {
                        menuRefs.current[index] = node;
                      }}
                      type="button"
                      variant="outline"
                      size="lg"
                      tabIndex={index === activeIndex ? 0 : -1}
                      data-focus-id={`mainMenu.${item.key}`}
                      aria-describedby={describedBy}
                      className="w-full active:bg-surface"
                      onFocus={() => setActiveIndex(index)}
                      onClick={() => {
                        setActiveIndex(index);
                        runCommand(item.command);
                      }}
                    >
                      {item.label}
                    </Button>
                    <div className="text-body text-text-secondary">
                      <p id={descriptionId}>{item.description}</p>
                      {/* The hint sits outside the control so it describes
                          `Load Career` without becoming part of its accessible name. */}
                      {item.command === "open_load_game" && loadHint !== null && (
                        <p id="menu-load-hint" className="mt-1 text-caption text-text-muted">
                          {loadHint}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>

          {resumeFailure !== null && (
            <p role="alert" className={`mt-4 w-full ${PANEL} text-data text-destructive`}>
              The last career could not be opened: {resumeFailure}
            </p>
          )}

          {/* Save repository unavailable (spec §10.1): explained, retryable, and
              nonblocking — every menu item above stays usable. */}
          {repository.status === "unavailable" && (
            <div
              role="status"
              className={`mt-4 w-full ${PANEL} flex items-center justify-between gap-3`}
            >
              <p className="text-data text-destructive">
                Saved careers could not be read. Starting a new career still works.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-action-id="retry-save-list"
                onClick={() => void dispatchAction("retry-save-list")}
              >
                Retry
              </Button>
            </div>
          )}

          <div className="flex-1" />
        </div>

        {/* Footer (spec §4.2): version and database edition sit in the shell's
            bottom bar, spanning the window like the header band above. */}
        <ShellBottomBar
          plan={{
            ...EMPTY_BOTTOM_BAR,
            status: [`Version ${APP_VERSION}`, `Database: ${DATABASE_EDITION} · Mods: none`],
          }}
        />

        {openPreferences && (
          <PreferencesDialog onClose={() => setOpenPreferences(false)} />
        )}

        {/* Credits (spec §5.4): informational, scrollable, with a Back action. */}
        {openCredits && (
          <Dialog title="Credits" onClose={() => setOpenCredits(false)}>
            <div className="max-h-64 overflow-y-auto text-body text-text-secondary">
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
          </Dialog>
        )}

        {/* Exit confirmation (spec §7): modal, default focus on Cancel, the
            destructive action styled distinctly, Escape cancels. No career is
            loaded here, so it must not warn about losing career progress. */}
        {openExit && (
          <Dialog title="Exit application?" onClose={() => setOpenExit(false)}>
            <p className="text-body text-text-secondary">
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
          </Dialog>
        )}
      </div>
    </RouteView>
  );
};
