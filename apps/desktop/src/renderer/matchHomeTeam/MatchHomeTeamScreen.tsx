import { type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";

export const MatchHomeTeamScreen = ({ saveId: _saveId }: { readonly saveId: SaveId }) => (
  <main
    tabIndex={-1}
    data-focus-id="matchHomeTeam"
    aria-label="Match Home Team"
    className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
  >
    <h1 className="text-2xl font-bold">Match Home Team</h1>
    <p className="mt-4 text-text-secondary italic">WIP — Placeholder screen</p>
  </main>
);