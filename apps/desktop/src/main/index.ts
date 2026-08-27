import path from "node:path";
import { fileURLToPath } from "node:url";
import { RPC_CHANNEL, type AppRpcMethod } from "@cm-clone/contracts";
import electron from "electron";
import { handleRpc } from "./rpcServer.js";

const { app, BrowserWindow, ipcMain } = electron;

// package.json's scoped name ("@cm-clone/desktop") contains a slash, which
// Electron otherwise splits into nested userData directories.
app.setName("cm-clone-desktop");

const dirname = path.dirname(fileURLToPath(import.meta.url));

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // Sandboxed preload execution runs scripts in a shared top-level scope
      // (no CJS module wrapper, no `require` for npm packages), which broke
      // on any bundled dependency that declares a top-level `const` shadowing
      // a preexisting global (e.g. effect's Scheduler and `setImmediate`).
      // Non-sandboxed preload uses the normal Node CJS module wrapper.
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
    handleRpc(method, payload, { savesDir }),
  );

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
