import path from "node:path";
import { fileURLToPath } from "node:url";
import { RPC_CHANNEL, type AppRpcMethod } from "@cm-clone/contracts";
import { Effect } from "effect";
import electron from "electron";
import { handleRpc } from "./rpc/rpcServer.js";
import { LoggerLayer } from "./rpc/logging.js";

const { app, BrowserWindow, ipcMain } = electron;

app.setName("cm-clone-desktop");

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
      LoggerLayer,
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
