/**
 * Scouting Centre (Screen 118) — the landing page of Scouting.
 *
 * Aggregates only: the club's Scouts and what each observes, read from `getScouting`, and the coverage
 * summary from `getScoutingKnowledge`, with links to Scouting Assignment (121) and Scouting Knowledge
 * (126). No reports feed, shortlist, recruitment focus or transfer-window panel.
 *
 * The two reads are independent, so each section carries its own loading, failure and empty state and
 * the links stay available whatever either read does. A club with no Scouts and a club with nothing
 * scouted are separate states: a club can have Scouts that have not scouted anything yet.
 *
 * Read-only, so an Archived Save renders the same way. Reached from the Recruitment submenu at
 * `/career/$saveId/scouting`, in the `scouting` screen scope.
 */
import type { SaveId } from "@cm-clone/contracts";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import { readState, scoutingAtom, scoutingKnowledgeAtom, useAtomValue } from "../rpc.js";
import { ScoutRosterRow } from "./ScoutRosterRow.js";
import { ScoutingCoverageSummary } from "./ScoutingCoverageSummary.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

export const ScoutingScreen = ({ saveId }: { readonly saveId: SaveId }) => (
  <main data-focus-id="scouting" aria-labelledby="scouting-centre-heading" className={PAGE_CLASS} tabIndex={-1}>
    <header>
      <h1 id="scouting-centre-heading" className="text-2xl font-bold">
        Scouting Centre
      </h1>
      <p className="mt-1 text-sm text-text-secondary">Your Scouts, what each observes, and how far your scouting reaches.</p>
    </header>

    <ScoutingLinks saveId={saveId} />

    <div className="mt-8">
      <h2 className="text-lg font-semibold">
        Scouts
      </h2>
      <ScoutRoster saveId={saveId} />
    </div>

    <div className="mt-8">
      <h2 className="text-lg font-semibold">
        Coverage
      </h2>
      <Coverage saveId={saveId} />
    </div>
  </main>
);

/** Opens Scouting's sub-surfaces: Scouting Assignment (121) and Scouting Knowledge (126). */
const ScoutingLinks = ({ saveId }: { readonly saveId: SaveId }) => (
  <div className="mt-4 flex gap-2">
    <Button
      type="button"
      variant="secondary"
      className={FOCUS_RING.join(" ")}
      onClick={(event) => navigateCareer({ type: "scoutingAssignment", saveId }, intentOfClick(event))}
    >
      Scouting Assignment
    </Button>
    <Button
      type="button"
      variant="secondary"
      className={FOCUS_RING.join(" ")}
      onClick={(event) => navigateCareer({ type: "scoutingKnowledge", saveId }, intentOfClick(event))}
    >
      Scouting Knowledge
    </Button>
  </div>
);

/** The club's Scouts, each row as Scouting Assignment renders it but without actions. */
const ScoutRoster = ({ saveId }: { readonly saveId: SaveId }) => {
  const board = readState(useAtomValue(scoutingAtom(saveId)), {
    loading: "Loading your Scouts...",
    failed: "The scouting board could not be loaded.",
  });
  if (board._tag !== "Ready") return <SectionMessage failed={board._tag === "Failed"} message={board.message} />;
  const { scouts } = board.value;
  if (scouts.length === 0) return <SectionMessage message="Your club has no Scouts." />;
  return (
    <ul className="mt-3 space-y-3" aria-label="Scouts">
      {scouts.map((scout) => (
        <ScoutRosterRow key={scout.scoutId} scout={scout} />
      ))}
    </ul>
  );
};

/** The coverage summary; its own empty state covers a club with nothing scouted yet. */
const Coverage = ({ saveId }: { readonly saveId: SaveId }) => {
  const knowledge = readState(useAtomValue(scoutingKnowledgeAtom(saveId)), {
    loading: "Loading scouting knowledge...",
    failed: "Scouting knowledge could not be loaded.",
  });
  if (knowledge._tag !== "Ready") {
    return <SectionMessage failed={knowledge._tag === "Failed"} message={knowledge.message} />;
  }
  return <ScoutingCoverageSummary knowledge={knowledge.value} />;
};

/** One line standing in for a section that is loading, failed or empty. */
const SectionMessage = ({ message, failed = false }: { readonly message: string; readonly failed?: boolean }) =>
  failed ? (
    <p role="alert" className="mt-3 text-sm text-text-danger">
      {message}
    </p>
  ) : (
    <p className="mt-3 text-text-secondary italic">{message}</p>
  );
