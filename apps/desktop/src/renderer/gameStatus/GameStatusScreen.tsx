import { type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";

export const GameStatusScreen = ({ saveId: _saveId }: { readonly saveId: SaveId }) => (
  <main
    tabIndex={-1}
    data-focus-id="gameStatus"
    aria-label="Game Status"
    className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
  >
    <h1 className="text-2xl font-bold">Game Status</h1>
    <p className="mt-4 text-text-secondary italic">WIP — Placeholder screen</p>
  </main>
);