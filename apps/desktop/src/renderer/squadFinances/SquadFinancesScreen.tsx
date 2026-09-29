import { type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";

export const SquadFinancesScreen = ({ saveId: _saveId }: { readonly saveId: SaveId }) => (
  <main
    tabIndex={-1}
    data-focus-id="squadFinances"
    aria-label="Squad Finances"
    className={`p-8 text-foreground ${FOCUS_RING.join(" ")}`}
  >
    <h1 className="text-title">Finances</h1>
    <p className="mt-4 text-text-secondary italic">WIP — Placeholder screen</p>
  </main>
);