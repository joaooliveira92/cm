import path from "node:path";
import { fileURLToPath } from "node:url";
import { RPC_CHANNEL, type AppRpcMethod } from "@cm-clone/contracts";
import { Effect, Layer } from "effect";
import electron from "electron";
import { MATCH_SEED_ENV, pinnedMatchSeedLayer, resolveMatchSeedOverride } from "./match/index.js";
import { handleRpc } from "./rpc/rpcServer.js";
import { LoggerLayer } from "./rpc/logging.js";

const { app, BrowserWindow, ipcMain } = electron;

app.setName("cm-clone-desktop");

// The e2e suite's only way to pin the match a Fixture plays (see `match/seedOverride.ts`). Gated on
// `app.isPackaged`: a build a player runs ignores it, while the unpackaged app Playwright launches
// honours it. A malformed value stops the app here rather than playing a match nobody asked for.
const matchSeedOverride = resolveMatchSeedOverride(process.env[MATCH_SEED_ENV], app.isPackaged);
if (matchSeedOverride._tag === "Malformed") {
  console.error(
    `${MATCH_SEED_ENV}=${JSON.stringify(matchSeedOverride.raw)} is not a match seed ` +
      "(expected a decimal integer from 0 to 4294967295). Refusing to start.",
  );
  app.exit(1);
} else if (matchSeedOverride._tag === "IgnoredInPackagedBuild") {
  console.warn(`${MATCH_SEED_ENV} is ignored in a packaged build; matches play under their derived seeds.`);
}

const rpcLayer =
  matchSeedOverride._tag === "Pinned"
    ? Layer.merge(LoggerLayer, pinnedMatchSeedLayer(matchSeedOverride.seed))
    : LoggerLayer;

const dirname = path.dirname(fileURLToPath(import.meta.url));

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    // macOS keeps its own traffic lights but drops the OS title bar, so the
    // app's own band reaches the top edge the way a native macOS app's does.
    // The renderer pays for this by reserving the traffic-light inset and by
    // marking the band as the window's drag handle (`chrome/header/drag-region.ts`).
    ...(process.platform === "darwin"
      ? { titleBarStyle: "hiddenInset" as const, trafficLightPosition: { x: 12, y: 14 } }
      : {}),
    webPreferences: {
      preload: path.join(dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.webContents.on("console-message", (_event, _level, message) => {
    console.log(`[renderer] ${message}`);
  });
  window.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error(`[preload:${preloadPath}]`, error);
  });

  if (process.env["VITE_DEV_SERVER_URL"]) {
    window.loadURL(process.env["VITE_DEV_SERVER_URL"]);
  } else {
    window.loadFile(path.join(dirname, "../renderer/index.html"));
  }
};

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

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
