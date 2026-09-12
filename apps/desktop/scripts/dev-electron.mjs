import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

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

await Promise.all([waitFor(mainEntry), waitFor(preloadEntry)]);

const devUrl = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";

const child = spawn("electron", ["."], {
  cwd: resolve(import.meta.dirname, ".."),
  stdio: "inherit",
  env: { ...process.env, VITE_DEV_SERVER_URL: devUrl },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

await new Promise((resolve) => {
  child.on("exit", resolve);
});