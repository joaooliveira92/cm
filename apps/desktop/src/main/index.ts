import path from "node:path";
import { fileURLToPath } from "node:url";
import { RPC_CHANNEL, type AppRpcMethod } from "@cm-clone/contracts";
import { Effect, Layer } from "effect";
import electron from "electron";
import { MATCH_SEED_ENV, pinnedMatchSeedLayer, resolveMatchSeedOverride } from "./match/index.js";
import { handleRpc } from "./rpc/rpcServer.js";
import { confirmQuit } from "./quit.js";
import { LoggerLayer } from "./rpc/logging.js";

const { app, BrowserWindow, ipcMain } = electron;

app.setName("cm-clone-desktop");

const matchSeedOverride = resolveMatchSeedOverride(process.env[MATCH_SEED_ENV], app.isPackaged);
if (matchSeedOverride._tag === "Malformed") {
  // Start-up gate before any window exists: the error must reach a terminal.
  // oxlint-disable-next-line no-console
  console.error(
    `${MATCH_SEED_ENV}=${JSON.stringify(matchSeedOverride.raw)} is not a match seed ` +
      "(expected a decimal integer from 0 to 4294967295). Refusing to start.",
  );
  app.exit(1);
} else if (matchSeedOverride._tag === "IgnoredInPackagedBuild") {
  // Same gate: a seed that cannot take effect is worth one line in the terminal.
  // oxlint-disable-next-line no-console
  console.warn(`${MATCH_SEED_ENV} is ignored in a packaged build; matches play under their derived seeds.`);
}

const rpcLayer =
  matchSeedOverride._tag === "Pinned"
    ? Layer.merge(LoggerLayer, pinnedMatchSeedLayer(matchSeedOverride.seed))
    : LoggerLayer;

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** The one window the app owns. Set once at `createWindow`, read by the
 *  quit guard to send show/hide messages to the renderer. */
let mainWindow: electron.BrowserWindow | null = null;

const createWindow = () => {
  const showInactive = process.env["CMC_HEADED_INACTIVE"] === "1";
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    ...(process.platform === "darwin"
      ? { titleBarStyle: "hiddenInset" as const, trafficLightPosition: { x: 12, y: 14 } }
      : {}),
    // The e2e suite runs headed (an Electron window cannot be headless) and must not steal the
    // player's OS focus. `show: false` defers the show so the window never grabs focus at
    // construction; `showInactive` then makes it visible without activating the app (macOS), while
    // Playwright still drives it through the debugging protocol, which needs no OS focus.
    ...(showInactive ? { show: false } : {}),
    webPreferences: {
      preload: path.join(dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (showInactive) window.showInactive();

  window.webContents.on("console-message", (_event, _level, message) => {
    // Main-process console is the only aggregator for renderer diagnostics in dev.
    // oxlint-disable-next-line no-console
    console.log(`[renderer] ${message}`);
  });
  window.webContents.on("preload-error", (_event, preloadPath, error) => {
    // A preload failure blanks the window; surface the cause rather than swallow it.
    // oxlint-disable-next-line no-console
    console.error(`[preload:${preloadPath}]`, error);
  });

  if (process.env["VITE_DEV_SERVER_URL"]) {
    window.loadURL(process.env["VITE_DEV_SERVER_URL"]);
  } else {
    window.loadFile(path.join(dirname, "../renderer/index.html"));
  }

  mainWindow = window;
};

// Only mac OS quits the app when all windows close — on Linux/Windows we go through `before-quit`.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.whenReady().then(() => {
  const savesDir = path.join(app.getPath("userData"), "saves");

  ipcMain.handle(RPC_CHANNEL, (_event, method: AppRpcMethod, payload: unknown) =>
    Effect.provide(
      handleRpc(method, payload, { savesDir, userDataDir: app.getPath("userData") }),
      rpcLayer,
    ).pipe(Effect.runPromise),
  );

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit guard (ticket 03 / group-a-reconciliation): prevent shutdown until the
// renderer confirms. The `before-quit` handler fires once for every quit path on
// every platform. We prevent default and ask the renderer via IPC; the renderer
// either confirms (quit-guard-confirmed) or cancels (quit-guard-cancelled).
//
// The flag prevents a second `before-quit` from blocking the `app.quit()` call
// that `quit-guard-confirmed` triggers — without it the second `before-quit`
// would prevent default again and start a new dialog request.
let quitGuardConfirmed = false;

app.on("before-quit", (event) => {
  if (quitGuardConfirmed) return;

  if (mainWindow === null || mainWindow.isDestroyed()) return;
  event.preventDefault();
  mainWindow.webContents.send("show-quit-guard");
});

/**
 * The renderer names a provisional career when the player confirmed losing one; `confirmQuit` does
 * the deleting and then quits, so the delete cannot race the exit. See `quit.ts` for why it lives
 * there and why a failed delete still quits.
 */
ipcMain.on("quit-guard-confirmed", (_event, discardSaveId: string | null) => {
  quitGuardConfirmed = true;
  void confirmQuit(app.getPath("userData"), discardSaveId, () => app.quit());
});

ipcMain.on("quit-guard-cancelled", () => {
  quitGuardConfirmed = false;
});

ipcMain.on("request-quit", () => {
  app.quit();
});
