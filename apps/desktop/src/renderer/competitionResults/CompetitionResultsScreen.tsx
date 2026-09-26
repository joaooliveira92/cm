/**
 * Competition Results (Screen 164): a Competition's *played* fixtures, newest first.
 *
 * The results half of what Screen 163 shows as a calendar, and it reads **the same RPC**.
 * `getCompetitionFixtures` already returns every fixture with `played`, `homeGoals` and
 * `awayGoals`, so a results list is that card filtered and reversed — not a new query.
 *
 * That is deliberate, and ticket 06 named it: there are already three fixture reads — the human's
 * own calendar (`getFixtures`), a Competition's card (`getCompetitionFixtures`) and a club's
 * matches wherever they fall (`getClubFixtures`) — and each answers a question the others cannot.
 * "The played subset of a card" is not such a question. The filtering is a handful of rows in a
 * Season; if a full pyramid ever makes that wrong, the read is the thing to change, not this
 * screen's shape.
 *
 * **Not attendance, player-of-the-match, or a tactical summary.** The import asks for all three and
 * none has a model — the same three the Group C ledger `deferred`s for Screen 41 Club Results. A
 * screen showing an invented attendance cannot be told from one showing a real number.
 */
import { type CompetitionId, type SaveId } from "@cm-clone/contracts";
import type { ReactNode } from "react";
import { Alert } from "../components/ui/alert.js";
import { CompetitionFixtureTable } from "../competitionFixturesDetail/CompetitionFixtureTable.js";
import { FOCUS_RING } from "../focus.js";
import { competitionFixturesAtom, describeRpcError, typedError, useAtomValue } from "../rpc.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** The arrival target in every state, matching Screen 163's shape: a read-only screen announces
 *  the same labelled region whether its read has settled or not. */
const ResultsMain = ({ children }: { readonly children: ReactNode }) => (
  <main
    tabIndex={-1}
    data-focus-id="competitionResults"
    aria-label="Competition Results"
    className={PAGE_CLASS}
  >
    {children}
  </main>
);

export const CompetitionResultsScreen = ({
  saveId,
  competitionId,
}: {
  readonly saveId: SaveId;
  readonly competitionId: CompetitionId;
}) => {
  const result = useAtomValue(competitionFixturesAtom(saveId, competitionId));
  const error = typedError(result);

  if (error)
    return (
      <ResultsMain>
        <Alert variant="destructive">
          <p>{describeRpcError(error)}</p>
        </Alert>
      </ResultsMain>
    );
  if (result._tag === "Initial")
    return (
      <ResultsMain>
        <p className="p-8 text-text-secondary">Loading competition results...</p>
      </ResultsMain>
    );
  if (result._tag === "Failure")
    return (
      <ResultsMain>
        <Alert variant="destructive">
          <p>Failed to load competition results</p>
        </Alert>
      </ResultsMain>
    );

  const view = result.value;
  // Newest first, which is the one thing a results list orders differently from a calendar. The
  // read returns date-ascending, so reversing the filtered subset is the whole transformation.
  // `filter` already returns a new array, so the reverse is on this screen's own copy and never
  // on the view's — no spread needed to make that true.
  const played = view.fixtures.filter((fixture) => fixture.played).reverse();

  return (
    <ResultsMain>
      <h1 className="text-2xl font-bold">Competition Results</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Season {view.season.seasonNumber} &middot; {played.length}{" "}
        {played.length === 1 ? "result" : "results"}
      </p>

      {result.waiting && <p className="mt-2 text-sm text-text-muted">Refreshing…</p>}

      {played.length === 0 ? (
        <p className="mt-8 text-text-secondary italic">
          No fixture in this competition has been played yet.
        </p>
      ) : (
        <CompetitionFixtureTable fixtures={played} label="Competition Results" />
      )}
    </ResultsMain>
  );
};
