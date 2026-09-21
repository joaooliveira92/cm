import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test as base } from "@playwright/test";
import type { ElectronApplication, Locator, Page } from "@playwright/test";
import { savesDir, seedFresh } from "./seedSaves.js";
import { NAV_SECTIONS, POSITION_KEYS, type NavSection } from "../src/renderer/navigation/nav-config.js";

const mainPath = path.join(import.meta.dirname, "../dist/main/index.js");

export const launchApp = (userDataDir: string) =>
  electron.launch({
    args: [mainPath, `--user-data-dir=${userDataDir}`],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "" },
  });

/**
 * How long an app gets to shut itself down before it is killed.
 *
 * A normal close takes well under a second (see `closeOrKill`), so this only bounds an app whose
 * main process is genuinely wedged. Without it the close never resolves, and Playwright's worker
 * teardown, which has no timeout of its own, stalls for a further 30s per test and then fails the
 * *worker*, burying the real failure under "Worker teardown timeout". A test that already failed
 * must not also cost the run half a minute of silence.
 */
const CLOSE_TIMEOUT_MS = 5_000;

/**
 * Quit the app through its quit guard, or kill it if it will not go.
 *
 * A bare `app.close()` never finishes on its own. Playwright closes by calling `app.quit()`, and the
 * main process's `before-quit` guard (`src/main/index.ts`) cancels that quit and asks the renderer
 * to show the Quit dialog, which nobody in a test answers. So this first confirms the guard the way
 * the dialog's Quit button does, by delivering `quit-guard-confirmed` to main's `ipcMain` listener.
 * That listener takes no arguments, only marks the quit confirmed and quits, so a bare `emit` is
 * the same thing the button sends. It goes through main rather than the dialog because a router
 * overlay can cover the dialog (group-a-reconciliation ticket 20).
 *
 * Both steps share one `CLOSE_TIMEOUT_MS` ceiling, `app.evaluate` included, since a wedged main
 * process never answers that either. Past the ceiling the process is killed.
 *
 * Safe to call on an app a test already closed: `app.process()` throws once the connection is gone,
 * and a teardown that throws is reported as a fixture error stacked on top of the real result.
 */
export const closeOrKill = async (app: ElectronApplication): Promise<void> => {
  let pid: number | undefined;
  try {
    pid = app.process().pid;
  } catch {
    return; // Already closed and detached.
  }
  const quitGracefully = async (): Promise<boolean> => {
    // The confirmed quit can end the process before `evaluate` replies. That rejection is expected,
    // and `app.close()` below still resolves, because it treats a closed target as closed.
    await app
      .evaluate(({ ipcMain }) => {
        ipcMain.emit("quit-guard-confirmed");
      })
      .catch(() => undefined);
    return app.close().then(
      () => true,
      () => false,
    );
  };
  let timer: NodeJS.Timeout | undefined;
  const closed = await Promise.race([
    quitGracefully(),
    new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), CLOSE_TIMEOUT_MS);
    }),
  ]);
  if (timer !== undefined) clearTimeout(timer);
  if (closed || pid === undefined) return;

  // SIGKILL rather than SIGTERM: the app is already not answering, and a
  // surviving Electron process holds the temp userDataDir the fixture is about
  // to remove.
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Already gone between the race and the kill — nothing to clean up.
  }
  await waitForExit(pid);
};

/**
 * Block until `pid` is really gone (or we give up on it).
 *
 * `process.kill` only *delivers* the signal; it returns long before the kernel has torn the process
 * down. Returning straight away raced the `userDataDir` fixture's `rmSync` against a dying Electron
 * still flushing into that directory, and macOS answered with `ENOTEMPTY` — which surfaced as a
 * second, misleading error stacked on top of whatever the test had actually failed on.
 */
const waitForExit = async (pid: number, timeoutMs = 2_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // Signal 0 checks for existence without delivering anything.
      process.kill(pid, 0);
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

/**
 * Remove the temp userDataDir, tolerating a straggler.
 *
 * Even after the process is reaped, macOS can briefly report the directory as non-empty while the
 * filesystem catches up. A failure to delete a temp directory must never fail an otherwise passing
 * test — the OS reclaims `tmpdir()` regardless — so the last attempt gives up quietly.
 */
const removeQuietly = (dir: string): void => {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      rmSync(dir, { recursive: true, force: true });
      return;
    } catch {
      // Retry; the loop's final iteration falls through and leaves the directory to the OS.
    }
  }
};

export interface LaunchFixtures {
  userDataDir: string;
  app: ElectronApplication;
  window: Page;
  /**
   * Launch an *additional* app against the same `userDataDir`, for the restart journeys.
   *
   * Those specs used to call `launchApp` directly and close with a bare `app.close()`, which never
   * resolves: the quit guard cancels Playwright's `app.quit()` and waits for a confirmation nobody
   * gives, and Playwright's worker teardown has no ceiling of its own. Everything launched through
   * this fixture is torn down with `closeOrKill`, which confirms the guard, and a genuinely wedged
   * app costs 5s rather than the worker.
   */
  launchExtraApp: (options?: { readonly userDataDir?: string }) => Promise<ElectronApplication>;
}

/**
 * "Primary" is Cmd on macOS and Ctrl elsewhere — the same decision the app's
 * keystroke normalizer makes (`src/renderer/keymap/keystroke.ts`). The e2e
 * suite must press the modifier the running platform actually treats as
 * Primary, or `Primary+K`/`Primary+/` never fire.
 */
export const PRIMARY_KEY = process.platform === "darwin" ? "Meta" : "Control";

/** Press a Primary-modifier chord, e.g. pressPrimary(page, "K") = Cmd+K / Ctrl+K. */
export const pressPrimary = async (page: Page, key: string): Promise<void> => {
  await page.keyboard.press(`${PRIMARY_KEY}+${key}`);
};

/**
 * Press the `g <key>` navigation prefix sequence as two keystrokes.
 *
 * Only for completions that end the prefix, which today means `g b`. A section key leaves a second
 * prefix level pending, so use `pressSectionKey` for those.
 */
export const pressPrefix = async (page: Page, key: string): Promise<void> => {
  await page.keyboard.press("g");
  await page.keyboard.press(key);
};

/** A section's 1-based navbar position as its `g` key, read from the same array the app binds from. */
const sectionKeyOf = (sectionId: string): { readonly key: string; readonly section: NavSection } => {
  const index = NAV_SECTIONS.findIndex((section) => section.id === sectionId);
  if (index < 0) throw new Error(`No navbar section with id "${sectionId}"`);
  return { key: String(index + 1), section: NAV_SECTIONS[index]! };
};

/**
 * Press `g <section position>`, which navigates to the section's default destination.
 *
 * The key does not end the prefix. It opens the item level (`g <section> <item key>`), which stays
 * pending until its ~800ms timeout. A `g` pressed inside that window cancels the pending level
 * instead of starting a new prefix, and the key after it then lands as a bare keystroke. So this
 * waits for the prefix indicator to appear and then clear before returning.
 */
export const pressSectionKey = async (page: Page, sectionId: string): Promise<void> => {
  const { key } = sectionKeyOf(sectionId);
  await page.keyboard.press("g");
  await page.keyboard.press(key);
  const indicator = page.getByRole("status").filter({ hasText: /^Go to:/ });
  await expect(indicator).toBeVisible();
  await expect(indicator).toHaveCount(0);
};

/**
 * Press `g <section position> <item key>`, which navigates to that item's destination. The item key
 * completes the prefix, so nothing is left pending afterwards.
 */
export const pressItemKey = async (page: Page, sectionId: string, itemId: string): Promise<void> => {
  const { key, section } = sectionKeyOf(sectionId);
  const itemIndex = section.items.findIndex((item) => item.id === itemId);
  const itemKey = POSITION_KEYS[itemIndex];
  if (itemKey === undefined) throw new Error(`No item key reaches "${itemId}" in section "${sectionId}"`);
  await page.keyboard.press("g");
  await page.keyboard.press(key);
  await page.keyboard.press(itemKey);
};

/**
 * Dismiss the one-shot teaching splash (AC-26). The splash is shipped, intended
 * first-run UI shown on the first load of a career screen (per-userDataDir
 * localStorage); a career driver dismisses it exactly as a player does — the
 * autofocused "Got it" button. Without this, the modal backdrop intercepts the
 * pointer on everything beneath it.
 */
export const dismissTeachingSplash = async (page: Page): Promise<void> => {
  const gotIt = page.getByRole("button", { name: "Got it" });
  // Tolerant by design: the splash is a genuine *one-shot*, keyed per userDataDir in localStorage,
  // so a spec that opens a second career in the same fixture will not see it again. Requiring it
  // here would fail those specs for doing nothing wrong. That the splash *does* appear on a real
  // first run is asserted on its own, unconditionally, in `teaching-splash-dismiss.spec.ts`.
  if (!(await gotIt.isVisible().catch(() => false))) {
    await gotIt.waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
  }
  if (!(await gotIt.isVisible().catch(() => false))) return;
  await gotIt.click();
  await expect(gotIt).not.toBeVisible();
};

/**
 * Where each career screen now lives in the navbar, as the path a player clicks to reach it.
 *
 * The flat lowercase tab strip ("transfers", "league table", "match day", …) that this suite was
 * written against is gone; `navigation/nav-config.ts` replaced it with seven primary sections that
 * each own a submenu. Clicking a section's own label navigates to its `defaultDestination`, so the
 * screens that are some section's default are still one click — the rest are two.
 *
 * Keeping the map here rather than inline in seven specs means the next navigation change is one
 * edit, and a screen that moves sections shows up as a single failing line instead of a scatter.
 */
const NAV_PATH = {
  squad: ["Squad"],
  tactics: ["Tactics"],
  training: ["Training"],
  transfers: ["Recruitment"],
  "transfer history": ["Recruitment", "Transfer History"],
  "contract expiry": ["Recruitment", "Contract Expiry"],
  "budget review": ["Recruitment", "Budget Review"],
  scouting: ["Recruitment", "Scouting"],
  "scouting assignment": ["Recruitment", "Scouting Assignment"],
  "scouting knowledge": ["Recruitment", "Scouting Knowledge"],
  "league table": ["Analysis"],
  fixtures: ["Analysis", "Fixtures"],
  "match day": ["Analysis", "Match Day"],
  "season summary": ["Analysis", "Season Summary"],
  manager: ["Club"],
  "club staff": ["Club", "Staff"],
  "club information": ["Club", "Information"],
  "club finances": ["Club", "Finances"],
  "board confidence": ["Club", "Board Confidence"],
  competitions: ["World"],
} as const satisfies Record<string, ReadonlyArray<string>>;

export type Screen = keyof typeof NAV_PATH;

/**
 * Navigate to a career screen through the navbar, the way a player does.
 *
 * Both clicks are scoped to their landmark (`Primary navigation`, `<Section> submenu`) because the
 * section labels are not unique on the page — "Squad" is also a heading and a table group, and
 * "Tactics" appears in the Match Day panel toggle.
 */
export const goto = async (page: Page, screen: Screen): Promise<void> => {
  const [section, item] = NAV_PATH[screen];
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("button", { name: section, exact: true })
    .click();
  if (item === undefined) return;
  await page
    .getByRole("navigation", { name: `${section} submenu` })
    .getByRole("button", { name: item, exact: true })
    .click();
};

/**
 * The live match scoreboard.
 *
 * It is a labelled region reading "Home 1 – 0 Away", not the `<h?>` with a hyphen that the suite
 * used to match on — and the separator is an en-dash, so the old `/ - /` pattern would not match
 * the text even if the role were still right.
 */
export const matchScore = (page: Page): Locator =>
  page.getByRole("region", { name: "Match score" });

/**
 * A save entry in the Load Career list.
 *
 * The entry is not a `<button>` element: `router/loadCareer.tsx` renders an `<li>` carrying
 * `role="button"` and `aria-label={`Save ${name}`}`, so its accessible name is the seed name with a
 * `Save ` prefix — "Save Seed: fresh", not "Seed: fresh". Every spec routes through this helper so
 * the prefix is stated once; a bare `getByRole("button", { name })` only ever worked by accident,
 * through Playwright's default *substring* name matching, and broke outright wherever a spec
 * tightened up with `exact: true`.
 */
export const saveEntry = (page: Page, name: string): Locator =>
  page.getByRole("button", { name: `Save ${name}`, exact: true });

/**
 * Choose an option from a screen toolbar popover (Squad's View and Position selectors): a trigger
 * button in the career chrome's actions band, and a portaled dialog of option buttons.
 */
export const chooseToolbarOption = async (
  page: Page,
  triggerName: string | RegExp,
  optionName: string | RegExp,
): Promise<void> => {
  await page.getByRole("button", { name: triggerName }).click();
  await page.getByRole("dialog").getByRole("button", { name: optionName, exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
};

/**
 * Choose an option from a Base UI `Select` by its visible label.
 *
 * The renderer has no native `<select>` left (`components/ui/select.tsx` is the vendored Base UI
 * primitive), so `selectOption()` and `locator("option")` address nothing. Base UI renders the
 * trigger as `combobox`, and portals the popup out to a `listbox` of `option`s on open — which is
 * why the listbox is looked up from the page rather than from inside the trigger's subtree. Driving
 * it is click-to-open then click-the-option, exactly as a player does.
 */
export const chooseOption = async (page: Page, comboboxName: string | RegExp, optionName: string | RegExp): Promise<void> => {
  await page.getByRole("combobox", { name: comboboxName }).click();
  await page.getByRole("listbox").getByRole("option", { name: optionName }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
};

/** The visible labels a Base UI `Select` offers, in order — the replacement for reading `<option>`s. */
export const optionLabels = async (page: Page, comboboxName: string | RegExp): Promise<ReadonlyArray<string>> => {
  await page.getByRole("combobox", { name: comboboxName }).click();
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  const labels = await listbox.getByRole("option").allInnerTexts();
  await page.keyboard.press("Escape");
  await expect(listbox).toHaveCount(0);
  return labels.map((label) => label.trim());
};

/** Seed a fresh career, reload, open Load Career, continue it (landing on the Squad route), and
 *  dismiss the first-run teaching splash — the shared career entry every spec's career driver uses. */
export const enterCareer = async (page: Page, userDataDir: string): Promise<void> => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: fresh");
};

/**
 * Reload so the app re-lists what the seed just wrote, open Load Career, continue the save with
 * `name`, and dismiss the first-run teaching splash.
 *
 * Split from `enterCareer` because the seeds differ (fresh, before-matchday, before-season-end,
 * concluded) while everything after the seed is identical; before this, four specs each carried
 * their own copy of these six lines and they drifted apart on the `Save ` prefix.
 */
export const continueSeededCareer = async (page: Page, name: string): Promise<void> => {
  // Return to the root route *before* reloading. Hash history survives a reload by design (AC-10),
  // so a spec that already entered one career would reload straight back into it and never see the
  // "Load Career" button — which is what happens when a test opens a second, differently-seeded
  // career partway through.
  await page.evaluate(() => {
    location.hash = "#/";
  });
  await page.reload();
  await page.getByRole("button", { name: "Load Career" }).click();
  const entry = saveEntry(page, name);
  await expect(entry).toBeVisible();
  await entry.click();
  await expect(page.getByText(/players$/)).toBeVisible();
  await dismissTeachingSplash(page);
};

/**
 * Open the tactics editor from the read-only overview.
 *
 * Opening Tactics now lands on the overview, not the editor (ticket 03), so every spec that edits
 * a tactic reaches the editor through the overview's one-step launch before `assignFullTactic`.
 */
export const openTacticsEditor = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "Open the tactics editor" }).click();
  await expect(page.getByRole("combobox", { name: "Slot 1 player", exact: true })).toBeVisible();
};

/**
 * Open the Match day live control panel, unless it is already open.
 *
 * The panel opens itself when an Injury to the controlled club is revealed, so a spec that presses
 * the toggle unconditionally closes the panel whenever the seeded match reveals one first. The
 * toggle's "Show"/"Hide" label is the open state; the check repeats until the panel is open, so
 * an auto-open landing between the read and the press is undone on the next pass.
 * `via: "keyboard"` focuses the toggle and presses Enter instead of clicking it.
 */
export const openLivePanel = async (page: Page, via: "click" | "keyboard" = "click"): Promise<void> => {
  const toggle = page.getByRole("button", { name: /Tactics & substitutions/ });
  await expect(toggle).toBeVisible({ timeout: 15_000 });
  await expect(async () => {
    const isOpen = (await toggle.textContent())?.trimEnd().endsWith("Hide") === true;
    if (!isOpen) {
      if (via === "keyboard") {
        await toggle.focus();
        await page.keyboard.press("Enter");
      } else {
        await toggle.click();
      }
    }
    await expect(page.getByText("Team instructions")).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
};

/**
 * Assign a distinct real player to each of the 11 tactic slots and save — the minimum valid Tactic
 * (11 unique players), required before the Match Day control panel will render.
 *
 * Every slot picks the *first* real option rather than the i-th: `TacticsScreen` filters players
 * already assigned elsewhere out of each slot's list, so "first available" is a different player
 * each time round and the 11 are distinct by construction. That is also why the loop cannot be
 * parallelised — slot i's options depend on slots 0..i-1.
 */
export const assignFullTactic = async (page: Page) => {
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(11);
  for (let i = 0; i < 11; i++) {
    const combobox = page.getByRole("combobox", { name: `Slot ${i + 1} player`, exact: true });
    await combobox.click();
    const listbox = page.getByRole("listbox");
    // Option 0 is "Unassigned"; option 1 is the first player not yet spoken for.
    await listbox.getByRole("option").nth(1).click();
    await expect(listbox).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Save Tactic" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
};

/**
 * Name `count` substitutes on the Tactic's bench from the Squad screen's lineup bar, which autosaves
 * each drop. A live substitution only brings on a player named on the bench (decision request 04,
 * group-g-match-day ticket 35), and the Tactics editor names starters only, so a journey that makes
 * a substitution names a bench first. Drags the first "Not selected" players of the position list
 * onto the bench slots in order.
 */
export const nameBench = async (page: Page, count = 3) => {
  await pressSectionKey(page, "squad");
  const benchSlots = page.getByTestId("lineup-bar").locator('[data-action-id="lineup-bench-slot"]');
  await expect(benchSlots).toHaveCount(7);
  const notSelected = page
    .getByRole("group", { name: "Squad" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("button", { name: "Not selected", exact: true }) });
  for (let benchIndex = 0; benchIndex < count; benchIndex++) {
    // Each drop takes the player off the "Not selected" list, so the first row is always the next one.
    const player = notSelected.first().locator('button[draggable="true"]');
    const [lastName, firstName] = ((await player.textContent()) ?? "").split(", ");
    await player.dragTo(benchSlots.nth(benchIndex));
    await expect(benchSlots.nth(benchIndex)).toHaveAccessibleName(`SB${benchIndex + 1} slot, ${firstName} ${lastName}`);
    await expect(page.getByTestId("lineup-save-state")).toHaveText("Saved.");
  }
};

export const test = base.extend<LaunchFixtures>({
  // Playwright 1.62 requires the fixture arg to be a destructuring pattern, even when empty.
  // oxlint-disable-next-line no-empty-pattern
  userDataDir: async ({ }, use) => {
    const dir = mkdtempSync(path.join(tmpdir(), "cm-clone-e2e-"));
    await use(dir);
    removeQuietly(dir);
  },
  app: async ({ userDataDir }, use) => {
    const app = await launchApp(userDataDir);
    await use(app);
    await closeOrKill(app);
  },
  window: async ({ app }, use) => {
    const page = await app.firstWindow();
    await use(page);
  },
  launchExtraApp: async ({ userDataDir }, use) => {
    const launched: ElectronApplication[] = [];
    await use(async (options) => {
      const app = await launchApp(options?.userDataDir ?? userDataDir);
      launched.push(app);
      return app;
    });
    // Sequential, not concurrent: each `closeOrKill` is already bounded at 5s, and closing several
    // Electron apps at once on a loaded machine is what made teardown flaky in the first place.
    for (const app of launched) await closeOrKill(app);
  },
});

export { expect };