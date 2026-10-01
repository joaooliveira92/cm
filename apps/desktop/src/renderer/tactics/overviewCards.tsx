import type { SaveId, TacticsOverviewView } from "@cm-clone/contracts";
import type { ReactNode } from "react";
import { TEAM_SWITCHES, slotLabel } from "@cm-clone/shared";
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
import { ratingFill, ratingText, spaced } from "./overviewFormat.js";
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
            {view.formation.template}
            {view.formation.modified && " (modified)"}
            {view.formation.shape !== view.formation.template && (
              <span className="ml-2 text-text-secondary">{view.formation.shape}</span>
            )}
          </span>
        )}
      </div>
      <OverviewPitch assignments={view.assignments} slots={view.formation?.slots} />
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
  const ratingAverage = average(
    view.assignments.flatMap((assignment) =>
      assignment.positionRating === null ? [] : [assignment.positionRating],
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
                <TableHead className={`${formationHeadClass} w-12`}>Cell</TableHead>
                <TableHead className={formationHeadClass}>Player</TableHead>
                <TableHead className={formationHeadClass}>Fit</TableHead>
                <TableHead className={`${formationHeadClass} text-right`}>Position rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.assignments.map((assignment, index) => (
                <TableRow key={`${assignment.playerId}-${index}`} className={formationRowClass}>
                  <TableCell className={`${formationCellClass} font-semibold`}>{slotLabel(assignment.cell)}</TableCell>
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
                  <TableCell className={formationCellClass}>
                    <Rating value={assignment.positionRating} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {ratingAverage !== null && (
          <p className="mt-2 text-right text-body text-text-secondary">
            Average position rating{" "}
            <span className={`font-semibold tabular-nums ${ratingText(ratingAverage)}`}>{ratingAverage}</span>
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

/** The team Mentality's five steps, from the most cautious to the most reckless. */
const MENTALITY_SCALE = ["ultraDefensive", "defensive", "normal", "attacking", "gungHo"] as const;

/** One instruction as a scale with the chosen step lit. The steps are decoration; the word beside
 *  them is what a screen reader hears. */
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
      <KeyValueValue>{spaced(value)}</KeyValueValue>
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

/** The Team Instructions that choose a value, in the order CM lists them after Mentality. */
const TEAM_CHOICE_ROWS = [
  ["Passing", "passing"],
  ["Focus passing", "focusPassing"],
  ["Tackling", "tackling"],
  ["Closing down", "closingDown"],
] as const;

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
            <InstructionScale label="Mentality" options={MENTALITY_SCALE} value={instructions.mentality} />
            {TEAM_CHOICE_ROWS.map(([label, key]) => (
              <KeyValueRow key={key}>
                <KeyValueKey>{label}</KeyValueKey>
                <KeyValueValue>{spaced(instructions[key])}</KeyValueValue>
              </KeyValueRow>
            ))}
            {TEAM_SWITCHES.map((name) => (
              <KeyValueRow key={name}>
                <KeyValueKey>{spaced(name)}</KeyValueKey>
                <KeyValueValue>{instructions[name] ? "On" : "Off"}</KeyValueValue>
              </KeyValueRow>
            ))}
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
          <p className="mt-1 text-text-soft">Familiarity is derived from the starters' cells.</p>
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
