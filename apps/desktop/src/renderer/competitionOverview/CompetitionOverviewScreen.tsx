import { type CompetitionId, type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";

export const CompetitionOverviewScreen = ({ saveId: _saveId, competitionId }: { readonly saveId: SaveId; readonly competitionId: CompetitionId }) => (
  <main
    tabIndex={-1}
    data-focus-id="competitionOverview"
    aria-label="Competition Overview"
    className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
  >
    <h1 className="text-2xl font-bold">Competition Overview</h1>
    <p className="mt-1 text-sm text-text-mono">Competition {competitionId}</p>
    <p className="mt-4 text-text-secondary italic">WIP — Placeholder screen</p>
  </main>
);