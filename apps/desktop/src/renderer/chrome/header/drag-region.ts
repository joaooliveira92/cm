/**
 * Electron treats the app's own title band as the window's drag handle.
 * Interactive children opt back out, or they cannot be clicked.
 *
 * Copied from the reference app's header. It earns its place here now that the
 * window is created with `titleBarStyle: "hiddenInset"` on macOS: without a
 * drag region the window would have no draggable edge at all.
 */
import type { CSSProperties } from "react";

export const DRAG = { WebkitAppRegion: "drag" } as CSSProperties;
export const NO_DRAG = { WebkitAppRegion: "no-drag" } as CSSProperties;
