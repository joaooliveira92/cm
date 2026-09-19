import { type SaveId } from "@cm-clone/contracts";
import { Alert } from "../components/ui/alert.js";
import { Spinner } from "../components/ui/spinner.js";
import { FOCUS_RING } from "../focus.js";
import { FixtureDayList } from "./FixtureDayList.js";
import { describeRpcError, fixturesAtom, typedError, useAtomValue } from "../rpc.js";

export const FixturesScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const fixturesResult = useAtomValue(fixturesAtom(saveId));

  const error = typedError(fixturesResult);
  if (error)
    return (
      <main
        tabIndex={-1}
        data-focus-id="fixtures"
        aria-label="Fixtures"
        className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
      >
        <Alert variant="destructive">
          <p>{describeRpcError(error)}</p>
        </Alert>
      </main>
    );
  if (fixturesResult._tag === "Initial")
    return (
      <main
        tabIndex={-1}
        data-focus-id="fixtures"
        aria-label="Fixtures"
        className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
      >
        <p className="flex items-center gap-2 p-8 text-text-secondary">
          <Spinner /> Loading fixtures...
        </p>
      </main>
    );
  if (fixturesResult._tag === "Failure")
    return (
      <main
        tabIndex={-1}
        data-focus-id="fixtures"
        aria-label="Fixtures"
        className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
      >
        <Alert variant="destructive">
          <p>Failed to load fixtures</p>
        </Alert>
      </main>
    );

  const fixtures = fixturesResult.value;

  return (
    <main
      tabIndex={-1}
      data-focus-id="fixtures"
      aria-label="Fixtures"
      className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <h1 className="text-2xl font-bold">Fixtures</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Season {fixtures.season.seasonNumber} &middot; {fixtures.fixtures.length} fixtures
        {fixturesResult.waiting && (
          <span className="ml-2 inline-flex items-center gap-1 text-text-muted">
            <Spinner className="h-3 w-3" /> Refreshing…
          </span>
        )}
      </p>

      <FixtureDayList fixtures={fixtures.fixtures} />
    </main>
  );
};
