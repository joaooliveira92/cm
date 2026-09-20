import { type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";

export const SquadHistoryScreen = ({ saveId: _saveId }: { readonly saveId: SaveId }) => (
  <main
    tabIndex={-1}
    data-focus-id="squadHistory"
    aria-label="Squad History"
    className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
  >
    <h1 className="text-2xl font-bold">History</h1>
    <p className="mt-4 text-text-secondary italic">WIP — Placeholder screen</p>
  </main>
);