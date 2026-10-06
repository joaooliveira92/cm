import { readdirSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

export function assertBuildFresh(srcDir: string, distDir: string): void {
  let newestSrc = 0;
  let oldestDist = Number.MAX_SAFE_INTEGER;

  const walk = (dir: string, collect: (mtime: number) => void) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, collect);
      } else if (entry.isFile()) {
        collect(statSync(full).mtime.getTime());
      }
    }
  };

  walk(srcDir, (mtime) => { if (mtime > newestSrc) newestSrc = mtime; });

  try {
    walk(distDir, (mtime) => { if (mtime < oldestDist) oldestDist = mtime; });
  } catch {
    oldestDist = 0;
  }

  if (newestSrc > oldestDist) {
    throw new Error(
      `Sources are newer than the e2e build. Run \`pnpm --filter @cm-clone/desktop test:e2e\` to rebuild.\n` +
      `  Newest source: ${new Date(newestSrc).toISOString()}\n` +
      `  Oldest dist:   ${oldestDist > 0 ? new Date(oldestDist).toISOString() : "(no dist)"}`,
    );
  }
}

/**
 * Keep a macOS machine awake for the length of the e2e run.
 *
 * An idle Mac turns its display off and then enters system sleep, and a sleep landing mid-run freezes
 * every Electron window, timer and Playwright wait with it. Whatever was in flight then fails on
 * waking, as a closed page, a prefix indicator that never cleared, or a fixture teardown past the
 * test timeout. A long sleep leaves the rest of the run to the suite's global timeout. Every red run
 * recorded in desktop-suite-red 17 that overlapped a `pmset -g log` sleep failed this way.
 *
 * `caffeinate -d -i` holds off both display sleep and idle system sleep. A display that is merely off
 * already counts as an occluded window to Chromium, which throttles its timers. `-w` ties caffeinate
 * to this runner process, so it lets go even if the run is killed before the teardown below runs.
 */
const globalSetup = (): (() => void) => {
  assertBuildFresh(
    path.join(import.meta.dirname, "../src"),
    path.join(import.meta.dirname, "../dist"),
  );
  if (process.platform !== "darwin") return () => undefined;
  const caffeinate = spawn("caffeinate", ["-d", "-i", "-w", String(process.pid)], { stdio: "ignore" });
  return () => {
    caffeinate.kill();
  };
};

export default globalSetup;
