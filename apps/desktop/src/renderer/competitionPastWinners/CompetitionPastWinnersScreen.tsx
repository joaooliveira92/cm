import { type CompetitionId, type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";

export const CompetitionPastWinnersScreen = ({ saveId: _saveId, competitionId }: { readonly saveId: SaveId; readonly competitionId: CompetitionId }) => (
  <main
    tabIndex={-1}
    data-focus-id="competitionPastWinners"
    aria-label="Competition Past Winners"
    className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
  >
    <h1 className="text-2xl font-bold">Competition Past Winners</h1>
    <p className="mt-1 text-sm text-text-mono">Competition {competitionId}</p>
    <p className="mt-4 text-text-secondary italic">WIP — Placeholder screen</p>
  </main>
);