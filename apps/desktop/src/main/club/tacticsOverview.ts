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
  TeamInstructionSummaryView,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import {
  FORMATION_SLOTS,
  assessContinueReadiness,
  assessMatchReadiness,
  familiarityTierCounts,
  partitionSelection,
  positionRating,
  roleRating,
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
        const slotIds = tactic === null ? [] : tactic.slots.map((slot) => slot.playerId);

        const assignments = (tactic?.slots ?? []).map((slot) => {
          const player = squadById.get(slot.playerId);
          return new PlayerAssignmentView({
            playerId: slot.playerId,
            firstName: player?.firstName ?? null,
            lastName: player?.lastName ?? null,
            position: slot.position,
            role: slot.role,
            positionRating:
              player === undefined
                ? null
                : positionRating(player.attributes as PlayerAttributes, slot.position),
            roleRating:
              player === undefined
                ? null
                : roleRating(player.attributes as PlayerAttributes, slot.role),
          });
        });

        const starterTiers: Array<FamiliarityTier> = [];
        if (tactic !== null) {
          for (const slot of tactic.slots) {
            const player = squadById.get(slot.playerId);
            if (player === undefined) continue;
            starterTiers.push(
              player.positions.find((position) => position.position === slot.position)?.familiarity ??
                "unfamiliar",
            );
          }
        }

        const { starters, substitutes } = partitionSelection(
          squad.map((player) => player.id),
          slotIds,
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
                  formation: tactic.formation,
                  slots: FORMATION_SLOTS[tactic.formation].map(
                    (position) => new FormationSlotView({ position }),
                  ),
                }),
          instructions:
            tactic === null
              ? null
              : new TeamInstructionSummaryView({
                  mentality: tactic.mentality,
                  tempo: tactic.tempo,
                  pressing: tactic.pressing,
                }),
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

/**
 * The snapshot's issues: every readiness finding relevant to tactical preparation, blockers and
 * advisories together, each carrying the screen that owns fixing it.
 *
 * Blockers come from the match-boundary rules (`no-tactic`, `tactic-names-departed-players`) — the
 * states that would stop the human's Fixture. Advisories come from the career readiness rules,
 * filtered to the advisory class: a pending bid is the standing condition the manager should know
 * about, while the career-loop-only blockers (a match in progress, an advance in flight, a
 * completed season) describe the calendar rather than what the manager can prepare, so a tactics
 * overview does not report them. The one finding both sides raise (`no-tactic`) is reported once,
 * at the stricter blocking severity.
 */
const buildIssues = (
  matchFacts: MatchReadinessFacts,
  phase: ReadinessSeasonPhase,
  pendingIncomingBids: number,
): ReadonlyArray<ReadinessIssueView> => {
  const matchBlockers = assessMatchReadiness(matchFacts).blockers;
  const advisories = assessContinueReadiness({
    phase,
    hasTactic: matchFacts.hasTactic,
    matchInProgress: false,
    advancing: false,
    pendingIncomingBids,
  }).items.filter((item) => item.severity === "advisory");

  return mergeReadinessItems(matchBlockers, advisories).map(
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