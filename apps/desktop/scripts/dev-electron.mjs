import { spawn } from "node:child_process";
import { existsSync, watch } from "node:fs";
import { dirname, resolve } from "node:path";

const mainEntry = resolve(import.meta.dirname, "../dist/main/index.js");
const preloadEntry = resolve(import.meta.dirname, "../dist/preload/index.cjs");

const waitFor = (file) =>
  new Promise((resolve) => {
    const tick = () => {
      if (existsSync(file)) return resolve();
      setTimeout(tick, 200);
    };
    tick();
  });

const bothEntries = () => Promise.all([waitFor(mainEntry), waitFor(preloadEntry)]);

await bothEntries();

const devUrl = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";

let child = null;
let restarting = false;
let shuttingDown = false;

const start = () => {
  child = spawn("electron", ["."], {
    cwd: resolve(import.meta.dirname, ".."),
    stdio: "inherit",
    env: { ...process.env, VITE_DEV_SERVER_URL: devUrl },
  });
  // A window closed by hand ends the dev session, as before; only an exit this script asked
  // for is followed by a fresh Electron.
  child.on("exit", () => {
    if (!restarting) process.exit(0);
  });
};

// The renderer hot-reloads from Vite, but main and preload are loaded once per Electron process.
// Without a restart, a rebuilt main bundle sits on disk while the running process keeps serving
// the old contract to a renderer that already speaks the new one.
const restart = async () => {
  if (shuttingDown) return;
  restarting = true;
  const previous = child;
  await new Promise((resolve) => {
    previous.once("exit", resolve);
    previous.kill("SIGTERM");
  });
  // `emptyOutDir` clears the folder before writing, so wait for both entries to be back.
  await bothEntries();
  restarting = false;
  if (shuttingDown) return;
  console.log("[dev-electron] main/preload rebuilt, restarting Electron");
  start();
};

// A single build writes in several steps, so settle before restarting.
let timer = null;
const scheduleRestart = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (restarting) return scheduleRestart();
    void restart();
  }, 400);
};

for (const entry of [mainEntry, preloadEntry]) {
  watch(dirname(entry), scheduleRestart);
}

start();

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shuttingDown = true;
    child?.kill(signal);
    process.exit(0);
  });
}
