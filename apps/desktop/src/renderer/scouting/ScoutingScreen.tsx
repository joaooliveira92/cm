import { type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";

export const ScoutingScreen = ({ saveId: _saveId }: { readonly saveId: SaveId }) => (
  <main
    tabIndex={-1}
    data-focus-id="scouting"
    aria-label="Scouting"
    className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
  >
    <h1 className="text-2xl font-bold">Scouting</h1>
    <p className="mt-4 text-text-secondary italic">WIP — Placeholder screen</p>
  </main>
);