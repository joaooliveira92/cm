/**
 * Competition Overview (Screen 161): a Competition's landing page.
 *
 * **It links, it does not list.** The table, the fixture card and the results all have their own
 * screens (162, 163, 164); this page names the competition, says how far through its season it is,
 * and offers the way in. Reimplementing any of those three here would be the second implementation
 * the club-scoped work spent four tickets avoiding.
 *
 * Eleven Group L screens are `deferred` for want of a model — statistics, records, awards, stages,
 * rules, history. A dashboard invites a panel for each of them, and there is deliberately none:
 * a link to a screen that does not exist is worse than no link.
 *
 * This is also the page that makes the competition branch reachable at all. Screens 162, 163 and
 * 164 shipped with no entry point and were addressable only by typing a URL. What links to *this*
 * page is the World section's Competitions entry, which is still a placeholder — group-l ticket 09.
 */
import { type CompetitionId, type SaveId } from "@cm-clone/contracts";
import type { ReactNode } from "react";
import { Alert } from "../components/ui/alert.js";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import {
  competitionOverviewAtom,
  describeRpcError,
  typedError,
  useAtomValue,
} from "../rpc.js";
import { PANEL } from "../theme.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** The arrival target in every state, matching the sibling competition screens' shape. */
const OverviewMain = ({ children }: { readonly children: ReactNode }) => (
  <main
    tabIndex={-1}
    data-focus-id="competitionOverview"
    aria-label="Competition Overview"
    className={PAGE_CLASS}
  >
    {children}
  </main>
);

/** The kind in the player's words. The wire carries the schema's own check-constraint values. */
const KIND_LABELS: Readonly<Record<string, string>> = {
  league: "League",
  cup: "Cup",
  reserve: "Reserve competition",
  continental: "Continental competition",
};

const Figure = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <div className={`rounded-md border p-4 ${PANEL}`}>
    <p className="text-sm text-text-secondary">{label}</p>
    <p className="text-xl font-semibold mt-1">{value}</p>
  </div>
);

export const CompetitionOverviewScreen = ({
  saveId,
  competitionId,
}: {
  readonly saveId: SaveId;
  readonly competitionId: CompetitionId;
}) => {
  const result = useAtomValue(competitionOverviewAtom(saveId, competitionId));
  const error = typedError(result);

  if (error)
    return (
      <OverviewMain>
        <Alert variant="destructive">
          <p>{describeRpcError(error)}</p>
        </Alert>
      </OverviewMain>
    );
  if (result._tag === "Initial")
    return (
      <OverviewMain>
        <p className="p-8 text-text-secondary">Loading competition overview...</p>
      </OverviewMain>
    );
  if (result._tag === "Failure")
    return (
      <OverviewMain>
        <Alert variant="destructive">
          <p>Failed to load competition overview</p>
        </Alert>
      </OverviewMain>
    );

  const view = result.value;

  /** The three sibling screens, as the only interaction this page has. */
  const links = [
    { label: "Table", type: "competitionTable" as const },
    { label: "Fixtures", type: "competitionFixturesDetail" as const },
    { label: "Results", type: "competitionResults" as const },
  ];

  return (
    <OverviewMain>
      <h1 className="text-2xl font-bold">{view.competitionName}</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {KIND_LABELS[view.kind] ?? view.kind}
        {view.nationName === null ? null : ` · ${view.nationName}`} · Season{" "}
        {view.season.seasonNumber}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {/* `club_count` is null for a competition whose field is a function of its sources — a cup
            drawn from other competitions. "—" rather than 0, which would be a claim. */}
        <Figure label="Clubs" value={view.clubCount === null ? "—" : String(view.clubCount)} />
        <Figure label="Played" value={String(view.playedCount)} />
        <Figure label="Remaining" value={String(view.remainingCount)} />
      </div>

      <nav aria-label="Competition sections" className="mt-8 flex gap-3">
        {links.map((link) => (
          <button
            key={link.type}
            type="button"
            className="rounded-md border px-4 py-2 underline-offset-2 hover:underline focus-visible:underline"
            onClick={(event) =>
              navigateCareer({ type: link.type, saveId, competitionId }, intentOfClick(event))
            }
          >
            {link.label}
          </button>
        ))}
      </nav>
    </OverviewMain>
  );
};
