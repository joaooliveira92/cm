/**
 * Competitions (World section): every competition in the save, each opening its Overview.
 *
 * **This is the way into the competition branch.** Screens 161–164 all shipped before this existed
 * and were reachable only by typing a URL — the same defect group-c ticket 02 fixed for
 * Club → Staff, and the reason group-l ticket 10 existed.
 *
 * A browse list and nothing more. No standings, no form, no honours: every screen that would source
 * such a column — statistics, records, history, awards — is `deferred` in the
 * [Group L ledger](../../../../docs/specs/group_l_competitions_nations_and_world_information/RECONCILIATION.md),
 * and a browse list is exactly where one would look harmless.
 */
import { type SaveId } from "@cm-clone/contracts";
import type { ReactNode } from "react";
import { Alert } from "../components/ui/alert.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.js";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import { competitionsAtom, describeRpcError, typedError, useAtomValue } from "../rpc.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** The kind in the player's words; the wire carries the schema's check-constraint values. */
const KIND_LABELS: Readonly<Record<string, string>> = {
  league: "League",
  cup: "Cup",
  reserve: "Reserve",
  continental: "Continental",
};

const CompetitionsMain = ({ children }: { readonly children: ReactNode }) => (
  <main tabIndex={-1} data-focus-id="competitions" aria-label="Competitions" className={PAGE_CLASS}>
    {children}
  </main>
);

export const CompetitionsScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const result = useAtomValue(competitionsAtom(saveId));
  const error = typedError(result);

  if (error)
    return (
      <CompetitionsMain>
        <Alert variant="destructive">
          <p>{describeRpcError(error)}</p>
        </Alert>
      </CompetitionsMain>
    );
  if (result._tag === "Initial")
    return (
      <CompetitionsMain>
        <p className="p-8 text-text-secondary">Loading competitions...</p>
      </CompetitionsMain>
    );
  if (result._tag === "Failure")
    return (
      <CompetitionsMain>
        <Alert variant="destructive">
          <p>Failed to load competitions</p>
        </Alert>
      </CompetitionsMain>
    );

  const { competitions } = result.value;

  return (
    <CompetitionsMain>
      <h1 className="text-2xl font-bold">Competitions</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {competitions.length} in this world &middot; open one for its table, fixtures and results
      </p>

      <div className="mt-6 overflow-x-auto">
        <Table className="min-w-full text-left" aria-label="Competitions">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pr-4">Competition</TableHead>
              <TableHead className="pr-4">Nation</TableHead>
              <TableHead className="pr-4">Kind</TableHead>
              <TableHead className="pr-2 text-center">Tier</TableHead>
              <TableHead className="pr-2 text-center">Clubs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {competitions.map((competition) => (
              <TableRow key={competition.competitionId}>
                <TableCell className="pr-4 whitespace-nowrap">
                  {/* The row's own control, named for its competition — "Open" repeated down
                      twenty rows tells a screen-reader user nothing about which. */}
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline focus-visible:underline"
                    aria-label={`${competition.competitionName} — overview`}
                    onClick={(event) =>
                      navigateCareer(
                        {
                          type: "competitionOverview",
                          saveId,
                          competitionId: competition.competitionId,
                        },
                        intentOfClick(event),
                      )
                    }
                  >
                    {competition.competitionName}
                  </button>
                </TableCell>
                {/* An em dash, not a blank: a cross-border tournament has no nation, and an empty
                    cell reads as missing data rather than as an answer. Same for tier and clubs,
                    which are null for a kind that does not sit on the ladder. */}
                <TableCell className="pr-4 whitespace-nowrap">
                  {competition.nationName ?? "—"}
                </TableCell>
                <TableCell className="pr-4 whitespace-nowrap">
                  {KIND_LABELS[competition.kind] ?? competition.kind}
                </TableCell>
                <TableCell className="pr-2 text-center tabular-nums">
                  {competition.tier ?? "—"}
                </TableCell>
                <TableCell className="pr-2 text-center tabular-nums">
                  {competition.clubCount ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CompetitionsMain>
  );
};
