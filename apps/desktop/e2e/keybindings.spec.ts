/**
 * The rebind-survives-restart journey deferred from ticket 21 (Stage 6): a
 * rebind applied in the help overlay (`Primary+/`) persists under `userData`
 * in `keybindings.json` and still applies after a full app relaunch — AC-34's
 * Playwright class, delivered in Stage 7 per the deferral.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  dismissTeachingSplash,
  expect,
  launchApp,
  pressPrimary,
  test,
} from "./launchApp.js";
import { savesDir, seedNamed } from "./seedSaves.js";

test("a rebind applied in the help overlay survives an app restart (AC-34)", async ({
  userDataDir,
}) => {
  // A fixed-name seeded save so both sessions can find the career by label.
  await seedNamed(savesDir(userDataDir), "Rebind Career");

  const firstApp = await launchApp(userDataDir);
  const firstWindow = await firstApp.firstWindow();
  await firstWindow.getByRole("button", { name: "Rebind Career" }).click();
  await dismissTeachingSplash(firstWindow);
  await expect(firstWindow.getByText(/players$/)).toBeVisible();

  // Primary+/ opens the help overlay — the rebinding surface (AC-36).
  await pressPrimary(firstWindow, "/");
  const help = firstWindow.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(help).toBeVisible();

  // Rebind "Go to Transfers" (coded default `g t`) to the free bare key `n`:
  // the two-step prefix rebinds as one entry, per the binding-overrides note.
  const rebind = help.getByRole("button", { name: "Rebind Go to Transfers" });
  await rebind.focus();
  await expect(rebind).toBeFocused();
  await firstWindow.keyboard.press("Enter");
  await expect(help.getByText("Press a key… (Escape cancels)")).toBeVisible();
  await firstWindow.keyboard.press("n");
  await expect(help.getByText("Go to Transfers is now bound to n.")).toBeVisible();

  // Close the overlay and confirm the override is live this session: `n`
  // navigates to Transfers from any career screen.
  await firstWindow.keyboard.press("Escape");
  await expect(help).not.toBeVisible();
  await firstWindow.keyboard.press("n");
  await expect(firstWindow.getByRole("heading", { name: /Transfers/ })).toBeVisible();

  await firstApp.close();

  // The override was persisted under userData, sibling of saves/ (never in the
  // save or the event stream).
  const stored = JSON.parse(
    readFileSync(path.join(userDataDir, "keybindings.json"), "utf8"),
  ) as Record<string, string>;
  expect(stored["go-to-transfers"]).toBe("n");

  // Relaunch against the same userDataDir: the binding still applies.
  const relaunched = await launchApp(userDataDir);
  const relaunchedWindow = await relaunched.firstWindow();
  await relaunchedWindow.getByRole("button", { name: "Rebind Career" }).click();
  await expect(relaunchedWindow.getByText(/players$/)).toBeVisible();
  await relaunchedWindow.keyboard.press("n");
  await expect(relaunchedWindow.getByRole("heading", { name: /Transfers/ })).toBeVisible();

  await relaunched.close();
});