/** The Tactics Overview's snapshot read (Screen 80 / ticket 02). */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  FamiliaritySummaryView,
  FormationSlotView,
  FormationSummaryView,
  PlayerAssignmentView,
  ReadinessIssueView,
  SelectedPlayerView,
  SelectionSummaryView,
  SetPieceStatusView,
  TacticsOverviewView,
  type PlayerId,
  type SaveId,
  type Tactic,
} from "@cm-clone/contracts";
import {
  assessContinueReadiness,
  assessMatchReadiness,
  builtInTemplate,
  familiarityOf,
  familiarityTierCounts,
  isModified,
  partitionSelection,
  positionRatingAt,
  rowCountLabel,
  slotLabel,
  type FamiliarityTier,
  type MatchReadinessFacts,
  type PlayerAttributes,
  type ReadinessItem,
  type ReadinessSeasonPhase,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadCurrentSeasonRow } from "../season/currentSeason.js";
import { withExistingSave } from "../season/decider.js";
import { loadMatchReadinessFacts } from "./matchReadiness.js";
import { loadSquadPlayers, loadUserClub } from "./squad.js";
import { loadPersistedTactic, loadTacticRevision, withTacticSavePermit } from "./tactics.js";

/**
 * One immutable snapshot of the active club's tactical preparation, every value bound to the club
 * tactic revision it was read at.
 *
 * The read runs under the save's tactic permit (shared with `changeTactics`) so an accepted save
 * can never land between two of its statements and hand back a Tactic from one revision beside a
 * revision counter from another. The snapshot is internally consistent by construction: a caller
 * that later learns a newer revision exists discards it whole rather than rendering a mix of old
 * and new.
 */
export const getTacticsOverview = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    withTacticSavePermit(
      saveId,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const club = yield* loadUserClub;
        const revision = yield* loadTacticRevision(club.id);
        const tactic = yield* loadPersistedTactic(club.id);
        const squad = yield* loadSquadPlayers(club.id);

        const seasonRow = yield* loadCurrentSeasonRow;
        const matchFacts = yield* loadMatchReadinessFacts(club.id);
        const pendingBidRows = yield* sql<{ count: number }>`
          SELECT COUNT(*) as "count" FROM bids WHERE selling_club_id = ${club.id} AND status = 'pending'`;
        const issues = buildIssues(
          matchFacts,
          seasonRow?.phase ?? "pre_season",
          pendingBidRows[0]?.count ?? 0,
        );

        const squadById = new Map(squad.map((player) => [player.id, player]));
        const slotIds = tactic === null ? [] : [...tactic.assignments];
        const benchIds =
          tactic === null ? [] : tactic.bench.filter((id): id is PlayerId => id !== null);

        const assignments = (tactic?.slots ?? []).map((slot, index) => {
          const playerId = tactic!.assignments[index]!;
          const player = squadById.get(playerId);
          return new PlayerAssignmentView({
            playerId,
            firstName: player?.firstName ?? null,
            lastName: player?.lastName ?? null,
            cell: slot.cell,
            positionRating:
              player === undefined
                ? null
                : positionRatingAt(player.attributes as PlayerAttributes, slot.cell),
            familiarity:
              player === undefined ? null : familiarityOf(player.suitability[slotLabel(slot.cell)] ?? 1),
          });
        });

        const starterTiers: Array<FamiliarityTier> = [];
        if (tactic !== null) {
          for (const [index, slot] of tactic.slots.entries()) {
            const player = squadById.get(tactic.assignments[index]!);
            if (player === undefined) continue;
            starterTiers.push(familiarityOf(player.suitability[slotLabel(slot.cell)] ?? 1));
          }
        }

        const { starters, substitutes } = partitionSelection(
          squad.map((player) => player.id),
          slotIds,
          benchIds,
        );
        const toSelected = (id: string): SelectedPlayerView => {
          const player = squadById.get(id as PlayerId);
          return new SelectedPlayerView({
            id: player!.id,
            firstName: player!.firstName,
            lastName: player!.lastName,
          });
        };

        return new TacticsOverviewView({
          club,
          revision,
          formation:
            tactic === null
              ? null
              : new FormationSummaryView({
                  template: tactic.sourceTemplate,
                  // A template the game has no record of (a saved tactic) reads as unmodified until
                  // the library ships; a built-in one is compared with the template it names.
                  modified: isModifiedFromBuiltIn(tactic),
                  shape: rowCountLabel(tactic.slots),
                  slots: tactic.slots.map((slot) => new FormationSlotView({ cell: slot.cell, run: slot.run })),
                }),
          instructions: tactic === null ? null : tactic.team,
          assignments,
          familiarity:
            tactic === null ? null : new FamiliaritySummaryView(familiarityTierCounts(starterTiers)),
          selection: new SelectionSummaryView({
            starters: starters.map(toSelected),
            substitutes: substitutes.map(toSelected),
          }),
          setPieces: new SetPieceStatusView({ status: "none" }),
          issues,
        });
      }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
    ),
  );

/** Whether a Tactic has moved off the built-in template it names; `false` for a name that is not one. */
const isModifiedFromBuiltIn = (tactic: Tactic): boolean => {
  const source = builtInTemplate(tactic.sourceTemplate);
  return source === undefined ? false : isModified(tactic, source);
};

/**
 * The snapshot's issues: every readiness finding relevant to tactical preparation, blockers and
 * advisories together, each carrying the screen that owns fixing it.
 *
 * Blockers come from the match-boundary rules (`no-tactic`, `tactic-names-departed-players`) — the
 * states that would stop the human's Fixture. Advisories come from the career readiness rules,
 * filtered to the advisory class: a pending bid can take a player out of this squad, so the manager
 * should know about it here. The career-loop-only blockers (a match in progress, an advance in
 * flight, a completed season) describe the calendar rather than what the manager can prepare, and
 * a squad the coming rollover leaves short is about next Season's contracts, not this Fixture, so a
 * tactics overview reports neither — the Continue band and the Contract Expiry screen own that one.
 * The one finding both sides raise (`no-tactic`) is reported once, at the stricter blocking severity.
 */
const buildIssues = (
  matchFacts: MatchReadinessFacts,
  phase: ReadinessSeasonPhase,
  pendingIncomingBids: number,
): ReadonlyArray<ReadinessIssueView> => {
  const matchReadiness = assessMatchReadiness(matchFacts);
  const advisories = assessContinueReadiness({
    phase,
    hasTactic: matchFacts.hasTactic,
    matchInProgress: false,
    advancing: false,
    pendingIncomingBids,
    // `null` keeps `squad-short-at-rollover` silent; see above.
    squadAtRollover: null,
  }).items.filter((item) => item.severity === "advisory");

  return mergeReadinessItems(matchReadiness.blockers, [...matchReadiness.advisories, ...advisories]).map(
    (item) =>
      new ReadinessIssueView({
        id: item.id,
        severity: item.severity,
        title: item.title,
        detail: item.detail,
        destination: item.destination,
      }),
  );
};

/** Blockers before advisories, deduplicated by id (a finding both raise is kept at its stricter,
 *  blocking severity). Match blockers come first, so the order is stable. */
const mergeReadinessItems = (
  matchBlockers: ReadonlyArray<ReadinessItem>,
  advisories: ReadonlyArray<ReadinessItem>,
): ReadonlyArray<ReadinessItem> => {
  const byId = new Map<string, ReadinessItem>();
  for (const item of [...matchBlockers, ...advisories]) {
    const existing = byId.get(item.id);
    if (
      existing === undefined ||
      (existing.severity === "advisory" && item.severity === "blocking")
    ) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
};