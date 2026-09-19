import type {
  ClubId,
  FixturesView,
  PlayerId,
  ReportFormResultView,
  ScoutedPlayerSummaryView,
  ScoutingFindingView,
} from "@cm-clone/contracts";
import type { FindingArea, KnowledgeConfidence, ReportFreshness } from "@cm-clone/shared";
import { FOCUS_RING } from "../focus.js";

/**
 * The Team Scout Report's read-only sections, and the one pure lookup the report's fixture action
 * needs. Split from the screen so the screen file holds the state rules and these hold the prose.
 */

const CONFIDENCE_LABELS: Readonly<Record<KnowledgeConfidence, string>> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  complete: "Complete",
};

const FRESHNESS_LABELS: Readonly<Record<ReportFreshness, string>> = {
  current: "Current",
  recent: "Recent",
  aging: "Aging",
  stale: "Stale",
};

const AREA_LABELS: Readonly<Record<FindingArea, string>> = {
  attack: "Attack",
  midfield: "Midfield",
  defense: "Defense",
  setPieces: "Set pieces",
};

export const confidenceLabel = (confidence: KnowledgeConfidence): string =>
  CONFIDENCE_LABELS[confidence];

export const freshnessLabel = (freshness: ReportFreshness): string => FRESHNESS_LABELS[freshness];

/** The report's route to the next meeting with the target club. */
export interface UpcomingFixture {
  /** `match` when the Calendar is stopped at this very Fixture, so Match day is where it is played;
   *  `fixtures` otherwise, because a later Fixture has no screen of its own to open. */
  readonly destination: "match" | "fixtures";
  readonly label: string;
}

/**
 * The earliest unplayed Fixture between the human club and the target, or null when there is none.
 *
 * Matched by club id on both sides, never by name. Ties on date keep the fixtures' own order, which
 * is the order the season read returns them in.
 */
export const upcomingFixtureAgainst = (
  view: FixturesView,
  humanClubId: ClubId,
  targetClubId: ClubId,
): UpcomingFixture | null => {
  const next = view.fixtures
    .filter(
      (fixture) =>
        !fixture.played &&
        ((fixture.homeClubId === humanClubId && fixture.awayClubId === targetClubId) ||
          (fixture.awayClubId === humanClubId && fixture.homeClubId === targetClubId)),
    )
    .reduce<(typeof view.fixtures)[number] | null>(
      (earliest, fixture) => (earliest === null || fixture.date < earliest.date ? fixture : earliest),
      null,
    );
  if (next === null) return null;
  const venue = next.homeClubId === humanClubId ? "home" : "away";
  const opponent = next.homeClubId === humanClubId ? next.awayClubName : next.homeClubName;
  const atBoundary = view.season.awaitingFixture?.fixtureId === next.id;
  return {
    destination: atBoundary ? "match" : "fixtures",
    label: atBoundary
      ? `Go to Match day: ${opponent} (${venue}), ${next.date}`
      : `Upcoming fixture: ${opponent} (${venue}), ${next.date}`,
  };
};

export const RecentForm = ({ results }: { readonly results: ReadonlyArray<ReportFormResultView> }) => (
  <section aria-labelledby="report-form-heading">
    <h2 id="report-form-heading" className="text-lg font-semibold">
      Recent form
    </h2>
    {results.length === 0 ? (
      <p className="mt-1 text-sm text-text-secondary">No matches played yet.</p>
    ) : (
      <ul className="mt-1 text-sm">
        {results.map((result) => (
          <li key={`${result.date}-${result.opponentClubName}`}>
            {/* The outcome is spelled out as a word, so a win and a loss never differ by colour alone. */}
            <span className="inline-block w-12 font-semibold">{outcomeOf(result)}</span>
            {result.goalsFor}–{result.goalsAgainst} {result.isHome ? "vs" : "at"}{" "}
            {result.opponentClubName}
            <span className="text-text-secondary"> · {result.date}</span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const outcomeOf = (result: ReportFormResultView): string =>
  result.goalsFor > result.goalsAgainst ? "Won" : result.goalsFor < result.goalsAgainst ? "Lost" : "Drawn";

export const FindingList = ({
  title,
  findings,
  className,
}: {
  readonly title: string;
  readonly findings: ReadonlyArray<ScoutingFindingView>;
  readonly className?: string;
}) => {
  const headingId = `report-${title.toLowerCase().replaceAll(" ", "-")}-heading`;
  return (
    <section aria-labelledby={headingId} className={className}>
      <h2 id={headingId} className="text-lg font-semibold">
        {title}
      </h2>
      {findings.length === 0 ? (
        // "Nothing observed" rather than "none": an empty list is a gap in what was seen, and the
        // report must never read as a claim that the club has no strengths.
        <p className="mt-1 text-sm text-text-secondary">Nothing observed yet.</p>
      ) : (
        <ul className="mt-1 text-sm">
          {findings.map((finding) => (
            <li key={`${finding.area}-${finding.note}`}>
              <span className="text-text-secondary">{AREA_LABELS[finding.area]}: </span>
              {finding.note}
              <span className="text-text-secondary">
                {" "}
                ({confidenceLabel(finding.confidence)} confidence)
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/** A key player's ability as the wire allows it: one number only when both bounds coincide, which
 *  is how Fully Scouted is expressed. Anything wider stays a range. */
const abilityText = (player: ScoutedPlayerSummaryView): string =>
  player.abilityLow === player.abilityHigh
    ? `${player.abilityLow}`
    : `${player.abilityLow}–${player.abilityHigh}`;

export const KeyPlayerList = ({
  players,
  onOpen,
}: {
  readonly players: ReadonlyArray<ScoutedPlayerSummaryView>;
  readonly onOpen: (playerId: PlayerId, event: { readonly detail: number }) => void;
}) => (
  <section aria-labelledby="report-key-players-heading">
    <h2 id="report-key-players-heading" className="text-lg font-semibold">
      Key players
    </h2>
    {players.length === 0 ? (
      <p className="mt-1 text-sm text-text-secondary">No players scouted yet.</p>
    ) : (
      <ul className="mt-1 text-sm">
        {players.map((player) => (
          <li key={player.playerId} className="py-0.5">
            <button
              type="button"
              className={`text-left underline-offset-2 hover:underline ${FOCUS_RING.join(" ")}`}
              onClick={(event) => onOpen(player.playerId, event)}
            >
              {player.firstName} {player.lastName}
            </button>
            <span className="text-text-secondary">
              {" "}
              · {player.position} · Ability {abilityText(player)} · Scouted {player.progress}%
            </span>
          </li>
        ))}
      </ul>
    )}
  </section>
);
