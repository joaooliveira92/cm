import { type CompetitionId, type SaveId } from "@cm-clone/contracts";
import type { ReactNode } from "react";
import { Alert } from "../components/ui/alert.js";
import { competitionFixturesAtom, describeRpcError, typedError, useAtomValue } from "../rpc.js";
import { FOCUS_RING } from "../focus.js";
import { CompetitionFixtureTable } from "./CompetitionFixtureTable.js";

const COMPETITION_FIXTURES_PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** The arrival target is the screen's labelled `<main>`, in every state (read-only screen: its
 *  loading and error branches render the same labelled region so keyboard arrival is announced
 *  the same way whether the read is settled or not). */
const CompetitionMain = ({ children }: { readonly children: ReactNode }) => (
  <main
    tabIndex={-1}
    data-focus-id="competitionFixturesDetail"
    aria-label="Competition Fixtures"
    className={COMPETITION_FIXTURES_PAGE_CLASS}
  >
    {children}
  </main>
);

export const CompetitionFixturesDetailScreen = ({
  saveId,
  competitionId,
}: {
  readonly saveId: SaveId;
  readonly competitionId: CompetitionId;
}) => {
  const fixturesResult = useAtomValue(competitionFixturesAtom(saveId, competitionId));
  const fixturesError = typedError(fixturesResult);

  if (fixturesError)
    return (
      <CompetitionMain>
        <Alert variant="destructive">
          <p>{describeRpcError(fixturesError)}</p>
        </Alert>
      </CompetitionMain>
    );
  if (fixturesResult._tag === "Initial")
    return (
      <CompetitionMain>
        <p className="p-8 text-text-secondary">Loading competition fixtures...</p>
      </CompetitionMain>
    );
  if (fixturesResult._tag === "Failure")
    return (
      <CompetitionMain>
        <Alert variant="destructive">
          <p>Failed to load competition fixtures</p>
        </Alert>
      </CompetitionMain>
    );

  const view = fixturesResult.value;

  return (
    <CompetitionMain>
      <h1 className="text-2xl font-bold">Competition Fixtures</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Season {view.season.seasonNumber} &middot; {view.fixtures.length} fixtures
      </p>

      {fixturesResult.waiting && <p className="mt-2 text-sm text-text-muted">Refreshing…</p>}

      <CompetitionFixtureTable fixtures={view.fixtures} label="Competition Fixtures" />
    </CompetitionMain>
  );
};
