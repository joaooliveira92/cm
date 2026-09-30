import type { SaveId, TacticsOverviewView } from "@cm-clone/contracts";
import type { ReactNode } from "react";
import { MENTALITY_OPTIONS, PRESSING_OPTIONS, TEMPO_OPTIONS, isCustomShape } from "@cm-clone/shared";
import { Badge } from "../components/ui/badge.js";
import { Card, CardContent } from "../components/ui/card.js";
import { KeyValueKey, KeyValueList, KeyValueRow, KeyValueValue } from "../components/ui/key-value.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.js";
import {
  formationCellClass,
  formationHeadClass,
  formationHeadRowClass,
  formationRowClass,
  formationTableClass,
} from "./formationTable.js";
import { FOCUS_RING } from "../focus.js";
import type {
  CareerDestination,
  SaveScopedCareerDestinationType,
} from "../navigation/destinations.js";
import { OverviewPitch } from "./OverviewPitch.js";
import { capitalize, ratingFill, ratingText, roleLabel } from "./overviewFormat.js";
import { FitIndicator } from "./FitIndicator.js";

type View = { readonly view: TacticsOverviewView };

const CardHeading = ({ children }: { readonly children: ReactNode }) => (
  <h2 className="text-overline uppercase text-text-secondary">{children}</h2>
);

export const FormationCard = ({ view }: View) => (
  <Card>
    <CardContent className="pt-2">
      <div className="mb-2 flex items-baseline justify-between">
        <CardHeading>Formation</CardHeading>
        {view.formation !== null && (
          <span className="text-figure tabular-nums">
            {view.formation.formation}
            {isCustomShape(
              view.formation.formation,
              view.formation.slots.map((slot) => slot.position),
            ) && " (custom)"}
          </span>
        )}
      </div>
      <OverviewPitch assignments={view.assignments} />
    </CardContent>
  </Card>
);

/** A 1-100 rating as its number beside a bar, the number tinted by fit. The bar is decoration:
 *  the number says it. */
const Rating = ({ value }: { readonly value: number | null }) => (
  <span className="flex items-center justify-end gap-2">
    <span aria-hidden="true" className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-border-subtle sm:block">
      <span
        className={`block h-full rounded-full ${ratingFill(value)}`}
        style={{ width: `${value ?? 0}%` }}
      />
    </span>
    <span className={`w-6 text-right font-semibold tabular-nums ${ratingText(value)}`}>
      {value ?? "–"}
    </span>
  </span>
);

const average = (values: ReadonlyArray<number>): number | null =>
  values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

export const SelectionCard = ({ view }: View) => {
  const roleAverage = average(
    view.assignments.flatMap((assignment) =>
      assignment.roleRating === null ? [] : [assignment.roleRating],
    ),
  );
  return (
    <Card>
      <CardContent className="pt-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <CardHeading>Selection</CardHeading>
          <p className="text-body font-semibold tabular-nums">
            {view.selection.starters.length} starters · {view.selection.substitutes.length} substitutes
          </p>
        </div>
        {view.assignments.length === 0 ? (
          <p className="mt-2 text-text-soft">No starters selected.</p>
        ) : (
          <Table className={formationTableClass}>
            <TableHeader>
              <TableRow className={formationHeadRowClass}>
                <TableHead className={`${formationHeadClass} w-10`}>Pos</TableHead>
                <TableHead className={formationHeadClass}>Player</TableHead>
                <TableHead className={formationHeadClass}>Fit</TableHead>
                <TableHead className={formationHeadClass}>Role</TableHead>
                <TableHead className={`${formationHeadClass} text-right`}>Position rating</TableHead>
                <TableHead className={`${formationHeadClass} text-right`}>Role rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.assignments.map((assignment, index) => (
                <TableRow key={`${assignment.playerId}-${index}`} className={formationRowClass}>
                  <TableCell className={`${formationCellClass} font-semibold`}>{assignment.position}</TableCell>
                  <TableCell className={formationCellClass}>
                    {assignment.firstName === null ? (
                      <span className="text-text-warning">Player no longer at the club</span>
                    ) : (
                      `${assignment.firstName} ${assignment.lastName}`
                    )}
                  </TableCell>
                  <TableCell className={formationCellClass}>
                    <FitIndicator tier={assignment.familiarity} />
                  </TableCell>
                  <TableCell className={`${formationCellClass} text-text-secondary`}>{roleLabel(assignment.role)}</TableCell>
                  <TableCell className={formationCellClass}>
                    <Rating value={assignment.positionRating} />
                  </TableCell>
                  <TableCell className={formationCellClass}>
                    <Rating value={assignment.roleRating} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {roleAverage !== null && (
          <p className="mt-2 text-right text-body text-text-secondary">
            Average role rating{" "}
            <span className={`font-semibold tabular-nums ${ratingText(roleAverage)}`}>{roleAverage}</span>
          </p>
        )}
        <div className="mt-3 border-t border-dashed border-border-subtle pt-2">
          <h3 className="text-heading">Substitutes</h3>
          {view.selection.substitutes.length === 0 ? (
            <p className="text-body text-text-secondary">Everyone is a starter.</p>
          ) : (
            <ul aria-label="Substitutes" className="mt-1 flex flex-wrap gap-1.5 text-body">
              {view.selection.substitutes.map((player) => (
                <li
                  key={player.id}
                  className="rounded-control border border-border-subtle px-2 py-0.5 text-text-soft"
                >
                  {player.firstName} {player.lastName}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/** One instruction as a three-step scale with the chosen step lit. The steps are decoration; the
 *  word beside them is what a screen reader hears. */
const InstructionScale = ({
  label,
  options,
  value,
}: {
  readonly label: string;
  readonly options: ReadonlyArray<string>;
  readonly value: string;
}) => (
  <div>
    <KeyValueRow>
      <KeyValueKey>{label}</KeyValueKey>
      <KeyValueValue>{capitalize(value)}</KeyValueValue>
    </KeyValueRow>
    <div aria-hidden="true" className="mt-1 flex gap-1">
      {options.map((option) => (
        <span
          key={option}
          className={`h-1.5 flex-1 rounded-full ${option === value ? "bg-primary" : "bg-border-subtle"}`}
        />
      ))}
    </div>
  </div>
);

export const TeamInstructionsCard = ({ view }: View) => {
  const instructions = view.instructions;
  return (
    <Card>
      <CardContent className="pt-2">
        <CardHeading>Team instructions</CardHeading>
        {instructions === null ? (
          <p className="mt-1 text-text-soft">Set a tactic to choose instructions.</p>
        ) : (
          <KeyValueList className="mt-2 space-y-3">
            <InstructionScale label="Mentality" options={MENTALITY_OPTIONS} value={instructions.mentality} />
            <InstructionScale label="Tempo" options={TEMPO_OPTIONS} value={instructions.tempo} />
            <InstructionScale label="Pressing" options={PRESSING_OPTIONS} value={instructions.pressing} />
          </KeyValueList>
        )}
      </CardContent>
    </Card>
  );
};

const FAMILIARITY_TIERS = [
  { key: "natural", label: "Natural", fill: "bg-text-success" },
  { key: "competent", label: "Competent", fill: "bg-text-highlight" },
  { key: "unfamiliar", label: "Unfamiliar", fill: "bg-text-warning" },
] as const;

export const FamiliarityCard = ({ view }: View) => {
  const familiarity = view.familiarity;
  const total =
    familiarity === null
      ? 0
      : familiarity.natural + familiarity.competent + familiarity.unfamiliar;
  return (
    <Card>
      <CardContent className="pt-2">
        <CardHeading>Familiarity</CardHeading>
        {familiarity === null ? (
          <p className="mt-1 text-text-soft">Familiarity is derived from the starters' positions.</p>
        ) : (
          <>
            {total > 0 && (
              <div aria-hidden="true" className="mt-2 flex h-2 overflow-hidden rounded-full bg-border-subtle">
                {FAMILIARITY_TIERS.map((tier) => (
                  <span
                    key={tier.key}
                    className={tier.fill}
                    style={{ width: `${(familiarity[tier.key] / total) * 100}%` }}
                  />
                ))}
              </div>
            )}
            <KeyValueList className="mt-2 space-y-0.5">
              {FAMILIARITY_TIERS.map((tier) => (
                <KeyValueRow key={tier.key} className="items-center">
                  <KeyValueKey className="flex items-center gap-2">
                    <span aria-hidden="true" className={`size-2 rounded-full ${tier.fill}`} />
                    {tier.label}
                  </KeyValueKey>
                  <KeyValueValue className="tabular-nums">{familiarity[tier.key]}</KeyValueValue>
                </KeyValueRow>
              ))}
            </KeyValueList>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export const SetPiecesCard = ({ view }: View) => (
  <Card>
    <CardContent className="pt-2">
      <CardHeading>Set pieces</CardHeading>
      {view.setPieces.status === "none" ? (
        <p className="mt-1 text-text-soft">No set pieces configured.</p>
      ) : (
        <p className="mt-1 text-text-soft">{view.setPieces.status}</p>
      )}
    </CardContent>
  </Card>
);

/** Where an issue's owning screen lives, from the overview's point of view. */
const ISSUE_DESTINATION: Readonly<Record<string, SaveScopedCareerDestinationType>> = {
  // From the overview, a "tactics"-owned fix means opening the editor — the overview itself is
  // already the Tactics home, so pointing an issue back at it would be a no-op.
  tactics: "tacticsEditor",
  match: "match",
  transfers: "transfers",
  seasonSummary: "seasonSummary",
  league: "league",
  manager: "manager",
  news: "news",
  squad: "squad",
  fixtures: "fixtures",
  contractExpiry: "contractExpiry",
};

const ISSUE_DESTINATION_LABELS: Readonly<Record<string, string>> = {
  tactics: "Open the editor",
  match: "Match day",
  transfers: "Transfers",
  seasonSummary: "Season summary",
  league: "League table",
  manager: "Manager profile",
  news: "News",
  squad: "Squad",
  fixtures: "Fixtures",
  contractExpiry: "Contract Expiry",
};

/** The outstanding issues, shown above everything else so a blocker is the first thing read. The
 *  screen renders it only when there is something to report. */
export const IssuesPanel = ({
  view,
  saveId,
  onOpen,
  readOnly,
}: View & {
  readonly saveId: SaveId;
  readonly onOpen: (destination: CareerDestination, event: { readonly detail: number }) => void;
  readonly readOnly: boolean;
}) => (
  <section aria-labelledby="overview-issues-heading">
    <h2 id="overview-issues-heading" className="sr-only">
      Outstanding issues
    </h2>
    <ul className="grid gap-2 text-body lg:grid-cols-2">
      {view.issues.map((issue) => {
        const route = ISSUE_DESTINATION[issue.destination ?? ""];
        const issueId = `overview-issue-${issue.id}`;
        const blocking = issue.severity === "blocking";
        return (
          <li
            key={issue.id}
            id={issueId}
            className={`flex items-start justify-between gap-3 rounded-panel border border-l-4 px-3 py-2 ${
              blocking ? "border-l-text-danger border-border-subtle" : "border-l-text-warning border-border-subtle"
            }`}
          >
            <span>
              <span className="font-semibold">{issue.title}.</span>{" "}
              <span className="text-text-secondary">{issue.detail}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1.5">
              {/* State never by color alone: the badge's tint is decoration; the word says it. */}
              <Badge variant={blocking ? "destructive" : "secondary"}>
                {blocking ? "Requires action" : "Notice"}
              </Badge>
              {route !== undefined && !readOnly && (
                // The warning is associated with the control that resolves it.
                <button
                  type="button"
                  aria-describedby={issueId}
                  className={`text-body underline underline-offset-2 hover:text-text-primary ${FOCUS_RING.join(" ")}`}
                  onClick={(event) =>
                    onOpen({ type: route, saveId } as CareerDestination, event)
                  }
                >
                  {ISSUE_DESTINATION_LABELS[issue.destination ?? ""] ?? "Fix"}
                </button>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  </section>
);
