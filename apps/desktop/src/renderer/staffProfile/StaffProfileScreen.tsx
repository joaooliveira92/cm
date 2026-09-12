import { type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";

export const StaffProfileScreen = ({ saveId: _saveId, staffId }: { readonly saveId: SaveId; readonly staffId: string }) => (
  <main
    tabIndex={-1}
    data-focus-id="staffProfile"
    aria-label="Staff Profile"
    className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
  >
    <h1 className="text-2xl font-bold">Staff Profile</h1>
    <p className="mt-1 text-sm text-text-mono">Staff {staffId}</p>
    <p className="mt-4 text-text-secondary italic">WIP — Placeholder screen</p>
  </main>
);