/**
 * One-shot teaching splash (command-palette note, AC-26). Exactly three
 * shortcuts (palette, help, navigation prefix) shown on the *first load of a
 * career screen* — never on the creation step — and never re-shown after
 * dismissal.
 *
 * Storage: a renderer-local `localStorage` flag. This is a purely cosmetic UI
 * preference — the renderer holds no authoritative game state (CONTEXT.md
 * forbids persisted authoritative game state in the renderer), so a "has the
 * player seen the teaching splash" flag is not game state and needs no RPC or
 * main-process write. Persisting the flag is required by "never re-shown": the
 * dismissal must survive a restart. The Stage 6 rebinding store is
 * `keybindings.json` under `userData` via the typed RPC seam — a heavier
 * mechanism reserved for mechanical, applied-everywhere settings, not a
 * cosmetic first-run preference.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Kbd } from "../components/ui/kbd.js";
import { useSeamHotkeys } from "../hotkeys.js";

export const teachingSplashStorageKey = "cmClone.teachingSplashSeen";

/** Read the durable "seen" flag. Optional-storage-safe: a blocked or absent
 *  localStorage must never block the first career load. */
export const readTeachingSplashSeen = (): boolean => {
  try {
    return window.localStorage.getItem(teachingSplashStorageKey) === "1";
  } catch {
    return false;
  }
};

/** Persist the "seen" flag. Best-effort — same cosmetic-only rationale. */
export const writeTeachingSplashSeen = (): void => {
  try {
    window.localStorage.setItem(teachingSplashStorageKey, "1");
  } catch {
    // A blocked localStorage returns the user to "show again" — acceptable for
    // a cosmetic preference and never a crash.
  }
};

/** The one-shot visor: visible until dismissed, then remembered forever. */
export const useTeachingSplashVisibility = (): {
  readonly visible: boolean;
  readonly dismiss: () => void;
} => {
  const [visible, setVisible] = useState(() => !readTeachingSplashSeen());
  const dismiss = useCallback(() => {
    writeTeachingSplashSeen();
    // Defer the visual removal one macrotask. The splash is *not* torn down in
    // the same tick as the trusted input (real click / Enter / Escape) that
    // dismissed it: React's synchronous discrete commit inside that input's
    // flush wedges the renderer in a tight loop on a first-run career screen
    // (reproduced across real click, Enter, and Escape; the same commit from an
    // untrusted event, or deferred one turn, never hangs). A cosmetic overlay is
    // not urgent, so committing on the next turn is invisible to the player.
    setTimeout(() => setVisible(false), 0);
  }, []);
  return { visible, dismiss };
};

/** Exactly three shortcuts (AC-14/AC-26): palette, help, navigation prefix. */
const SHORTCUTS: ReadonlyArray<{ readonly keys: string; readonly description: string }> = [
  { keys: "Cmd+K", description: "Open the command palette and find any action" },
  { keys: "Cmd+/", description: "Open the keyboard shortcuts reference" },
  { keys: "g <key>", description: "Move between screens (g s Squad, g t Transfers, ...)" },
];

/**
 * The dismissible teaching card. Mounted by the keyboard spine while `isCareer`
 * and never seen before; `Escape` dismisses like any transient layer, and the
 * dismiss button is autofocused so Enter dismisses too. Dismissal hands back to
 * the spine, which returns focus to the career screen.
 */
export const TeachingSplash = ({ onDismiss }: { readonly onDismiss: () => void }) => {
  const dismissRef = useRef<HTMLButtonElement | null>(null);

  useSeamHotkeys("Escape", (event) => {
    event.preventDefault();
    onDismiss();
  }, undefined, [onDismiss]);

  useEffect(() => {
    dismissRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
      <Card
        role="dialog"
        aria-modal="true"
        aria-label="Playing a new career"
        className="w-[28rem] max-w-[90vw] bg-panel-bg-strong p-3 shadow-2xl"
      >
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-xl">This career is played from the keyboard</CardTitle>
          <p className="text-sm text-text-secondary">
            Everything works without a mouse. These three shortcuts are all you need to start:
          </p>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <ul className="space-y-2">
            {SHORTCUTS.map((shortcut) => (
              <li key={shortcut.description} className="flex items-baseline gap-3 text-sm text-text-strong">
                <Kbd className="text-text-highlight">{shortcut.keys}</Kbd>
                <span>{shortcut.description}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex justify-end">
            <Button ref={dismissRef} type="button" onClick={onDismiss}>
              Got it
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};