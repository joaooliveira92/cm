import { PHASE_POSITIONS, type Position } from "./positions.js";
import {
  attributeRange,
  FULLY_SCOUTED,
  KNOWLEDGE_CONFIDENCES,
  REPORT_FRESHNESSES,
  type FindingArea,
  type KnowledgeConfidence,
  type ReportFreshness,
} from "./scouting.js";

/**
 * Team Scout Report derivation: what a club's scouted knowledge of another club adds up to.
 *
 * Pure and database-free, so the *meaning* of a report is unit-testable without a save on disk.
 * Everything here is a deterministic function of its arguments — no clock, no randomness, no
 * ambient state — because a report that read the wall clock would differ between two reads at the
 * same calendar revision, and the contract promises it does not.
 *
 * **The leak rule is the hard constraint.** A below-Fully-Scouted player's true ability must not
 * escape, and "escape" includes ordering: sorting a list by a hidden value publishes that value's
 * ranking just as surely as printing it. So nothing here ever sorts, bands, or phrases against a
 * true rating directly. Every comparison runs on the *midpoint of the displayed Attribute Range*,
 * which the manager can already compute from the two bounds on screen — a function of published
 * numbers publishes nothing new. That is the whole argument, and it is why `estimatedAbility` below
 * exists rather than the code reaching for `member.overallRating`.
 *
 * **Unknown stays Unknown.** A club with no scouted players yields `null` here, never a report with
 * empty findings. The caller turns that into the not-scouted failure. An empty report would read to
 * a manager as "this club has no strengths", which is a claim the data cannot support.
 */

/** One member of the target's squad as the deriving side sees them, hidden values included. */
export interface TargetSquadMember {
  readonly playerId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly position: Position;
  /** 0-100. Zero means Unscouted — the absence of knowledge, not a knowledge of zero. */
  readonly progress: number;
  /** The player's true overall rating, 1-100. **Never emitted and never sorted on.** It reaches the
   *  outside only through `attributeRange`, which widens it into a band by the player's progress. */
  readonly overallRating: number;
}

/** One recent result from the target's point of view. Public information: a league table and a
 *  results list are visible to everyone, so nothing here is gated on scouting. */
export interface TargetFormResult {
  readonly date: string;
  readonly opponentClubName: string;
  readonly isHome: boolean;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
}

export interface TeamScoutReportInputs {
  readonly squad: ReadonlyArray<TargetSquadMember>;
  readonly recentForm: ReadonlyArray<TargetFormResult>;
  /** Calendar days since this club's knowledge last advanced. Drives Freshness. */
  readonly daysSinceObserved: number;
}

export interface DerivedFinding {
  readonly area: FindingArea;
  readonly note: string;
  readonly confidence: KnowledgeConfidence;
}

export interface DerivedKeyPlayer {
  readonly playerId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly position: Position;
  readonly progress: number;
  readonly abilityLow: number;
  readonly abilityHigh: number;
}

export interface DerivedFormation {
  readonly formation: string;
  readonly confidence: KnowledgeConfidence;
}

export interface DerivedTeamScoutReport {
  readonly knowledgeConfidence: KnowledgeConfidence;
  readonly freshness: ReportFreshness;
  readonly predictedFormation: DerivedFormation | null;
  readonly strengths: ReadonlyArray<DerivedFinding>;
  readonly weaknesses: ReadonlyArray<DerivedFinding>;
  readonly keyPlayers: ReadonlyArray<DerivedKeyPlayer>;
  readonly setPieceFindings: ReadonlyArray<DerivedFinding>;
}

/** A player counts as scouted once any progress exists. Sparse rows mean absence, so this is the
 *  same test as "has a progress row". */
const isScouted = (member: TargetSquadMember): boolean => member.progress > 0;

/**
 * The midpoint of a player's displayed Attribute Range — the only ability figure this module is
 * allowed to compare on. Derived from the same two bounds the screen shows, so it publishes nothing
 * the manager cannot already read off the report.
 */
const estimatedAbility = (member: TargetSquadMember): number => {
  const [low, high] = attributeRange(member.overallRating, member.progress);
  return (low + high) / 2;
};

/**
 * How much of the target squad the report rests on: total progress over the whole squad, so both
 * scouting one more player and scouting an already-known player further raise it.
 *
 * Dividing by the **whole** squad rather than by the scouted subset is what makes the number mean
 * coverage. Averaging over the scouted subset alone would score one exhaustively-known player as
 * complete knowledge of the club, which is exactly backwards.
 */
export const squadCoverage = (squad: ReadonlyArray<TargetSquadMember>): number => {
  if (squad.length === 0) return 0;
  const total = squad.reduce((sum, m) => sum + Math.min(FULLY_SCOUTED, Math.max(0, m.progress)), 0);
  return total / (FULLY_SCOUTED * squad.length);
};

/** Coverage banded into the four confidence levels. Monotonic by construction: the thresholds
 *  ascend, so more progress can only move a report up the bands, never down. */
export const knowledgeConfidenceFor = (coverage: number): KnowledgeConfidence => {
  const [low, moderate, high, complete] = KNOWLEDGE_CONFIDENCES;
  if (coverage < 0.25) return low;
  if (coverage < 0.5) return moderate;
  if (coverage < 0.85) return high;
  return complete;
};

/**
 * Calendar age banded into the four freshness levels.
 *
 * Age is a **proxy**, not the thing itself: a report goes stale because the squad, tactics, and
 * injuries move away from what was observed, and days elapsed is the only measure of that available
 * without diffing the target's squad against a snapshot nothing stores. The bands are set against a
 * transfer window rather than a match: a report that predates the window a club bought in is the
 * case a manager actually gets burned by.
 */
export const freshnessFor = (daysSinceObserved: number): ReportFreshness => {
  const [current, recent, aging, stale] = REPORT_FRESHNESSES;
  const days = Math.max(0, daysSinceObserved);
  if (days <= 13) return current;
  if (days <= 41) return recent;
  if (days <= 83) return aging;
  return stale;
};

/** Which finding area a position answers to, following the match engine's own phase grouping so a
 *  report and the simulation partition a squad the same way. */
const AREA_OF_POSITION: Readonly<Record<Position, Exclude<FindingArea, "setPieces">>> =
  Object.fromEntries(
    Object.entries(PHASE_POSITIONS).flatMap(([phase, positions]) =>
      positions.map((position) => [position, phase as Exclude<FindingArea, "setPieces">]),
    ),
  ) as Readonly<Record<Position, Exclude<FindingArea, "setPieces">>>;

const PLAYING_AREAS = ["defense", "midfield", "attack"] as const;

/** The mid-scale anchor a phase is called strong or weak against. Position Ratings run 1-100, so
 *  50 is the neutral middle: this is a fixed reference, never a comparison to the reading club,
 *  because a report describes the target rather than the gap to whoever is reading it. */
const NEUTRAL_ABILITY = 50;
const STRENGTH_MARGIN = 8;

interface AreaReading {
  readonly area: Exclude<FindingArea, "setPieces">;
  readonly estimate: number;
  readonly confidence: KnowledgeConfidence;
  readonly scoutedCount: number;
}

/** What the scouted members say about each phase of the target's team. */
const readAreas = (squad: ReadonlyArray<TargetSquadMember>): ReadonlyArray<AreaReading> =>
  PLAYING_AREAS.map((area) => {
    const inArea = squad.filter((m) => AREA_OF_POSITION[m.position] === area);
    const scouted = inArea.filter((m) => isScouted(m));
    const estimate =
      scouted.length === 0
        ? 0
        : scouted.reduce((sum, m) => sum + estimatedAbility(m), 0) / scouted.length;
    return {
      area,
      estimate,
      confidence: knowledgeConfidenceFor(squadCoverage(inArea)),
      scoutedCount: scouted.length,
    };
  });

/** Deterministic ordering for findings: strongest (or weakest) first, ties broken by the fixed
 *  area order, so two runs over the same squad emit the same list in the same sequence. */
const byArea = (a: AreaReading, b: AreaReading): number =>
  PLAYING_AREAS.indexOf(a.area) - PLAYING_AREAS.indexOf(b.area);

const describeStrength = (reading: AreaReading): string =>
  `Scouted ${reading.area} players read above average (${reading.scoutedCount} seen).`;

const describeWeakness = (reading: AreaReading): string =>
  `Scouted ${reading.area} players read below average (${reading.scoutedCount} seen).`;

/** How many key players a report names. A fixed, small number: the report is an orientation, and a
 *  list as long as the squad is the squad screen rather than a report. */
const KEY_PLAYER_COUNT = 5;

/**
 * The scouted members most worth naming, strongest estimate first.
 *
 * Sorted on the displayed range's midpoint, never the true rating — see the leak rule above. The
 * tie-break is the stable player id, so equal estimates resolve the same way on every run rather
 * than inheriting whatever order the database handed back.
 */
export const deriveKeyPlayers = (
  squad: ReadonlyArray<TargetSquadMember>,
): ReadonlyArray<DerivedKeyPlayer> =>
  squad
    .filter((m) => isScouted(m))
    .map((m) => {
      const [abilityLow, abilityHigh] = attributeRange(m.overallRating, m.progress);
      return {
        playerId: m.playerId,
        firstName: m.firstName,
        lastName: m.lastName,
        position: m.position,
        progress: m.progress,
        abilityLow,
        abilityHigh,
        estimate: (abilityLow + abilityHigh) / 2,
      };
    })
    .sort((a, b) => b.estimate - a.estimate || a.playerId.localeCompare(b.playerId))
    .slice(0, KEY_PLAYER_COUNT)
    .map(({ estimate: _estimate, ...player }) => player);

/**
 * The shape the target is predicted to line up in.
 *
 * Inferred from where the **scouted** players play, never read from the target's tactic record:
 * spec §8 puts another club's tactical information behind explicit permission, and scouting is not
 * that permission. So this counts the positions actually observed and names the closest standard
 * shape. It is a prediction and may be wrong, which is why it carries its own confidence and is
 * withheld entirely below `moderate` — a guess from almost no observations is noise wearing the
 * costume of information.
 */
export const derivePredictedFormation = (
  squad: ReadonlyArray<TargetSquadMember>,
  confidence: KnowledgeConfidence,
): DerivedFormation | null => {
  if (confidence === "low") return null;
  const scouted = squad.filter((m) => isScouted(m));
  const outfield = scouted.filter((m) => m.position !== "GK");
  if (outfield.length === 0) return null;
  const counts = PLAYING_AREAS.map(
    (area) => outfield.filter((m) => AREA_OF_POSITION[m.position] === area).length,
  );
  const total = counts.reduce((sum, n) => sum + n, 0);
  if (total === 0) return null;
  // Scale the observed shares onto the ten outfield places a formation names, then correct the
  // rounding drift onto defence so the parts always sum to ten rather than to nine or eleven.
  const scaled = counts.map((n) => Math.round((n / total) * 10));
  const drift = 10 - scaled.reduce((sum, n) => sum + n, 0);
  const [defense = 0, midfield = 0, attack = 0] = scaled;
  return { formation: `${defense + drift}-${midfield}-${attack}`, confidence };
};

/**
 * Set-piece findings.
 *
 * Predictions, and labelled as such: nothing in the save records a club's set-piece routines, so
 * these are read off the phases the target is strong and weak in rather than from a rehearsal the
 * game does not simulate. They are withheld below `high` confidence, because a set-piece claim
 * from a thin reading is the kind of confident-sounding noise a manager would act on.
 */
export const deriveSetPieceFindings = (
  areas: ReadonlyArray<AreaReading>,
  confidence: KnowledgeConfidence,
): ReadonlyArray<DerivedFinding> => {
  if (confidence === "low" || confidence === "moderate") return [];
  const defense = areas.find((a) => a.area === "defense");
  if (defense === undefined || defense.scoutedCount === 0) return [];
  const note =
    defense.estimate >= NEUTRAL_ABILITY
      ? "Defends its own box well; expect little from crosses and corners."
      : "Vulnerable defending its own box; corners and crosses are worth loading.";
  return [{ area: "setPieces", note, confidence: defense.confidence }];
};

/**
 * The whole derivation. Returns `null` when nobody at the target has been scouted — the caller
 * raises the not-scouted failure from that rather than shipping an empty report.
 */
export const deriveTeamScoutReport = (
  inputs: TeamScoutReportInputs,
): DerivedTeamScoutReport | null => {
  const { squad, daysSinceObserved } = inputs;
  if (!squad.some((m) => isScouted(m))) return null;

  const knowledgeConfidence = knowledgeConfidenceFor(squadCoverage(squad));
  const areas = readAreas(squad);
  const seen = areas.filter((a) => a.scoutedCount > 0);

  return {
    knowledgeConfidence,
    freshness: freshnessFor(daysSinceObserved),
    predictedFormation: derivePredictedFormation(squad, knowledgeConfidence),
    strengths: seen
      .filter((a) => a.estimate >= NEUTRAL_ABILITY + STRENGTH_MARGIN)
      .sort((a, b) => byArea(a, b))
      .map((a) => ({ area: a.area, note: describeStrength(a), confidence: a.confidence })),
    weaknesses: seen
      .filter((a) => a.estimate <= NEUTRAL_ABILITY - STRENGTH_MARGIN)
      .sort((a, b) => byArea(a, b))
      .map((a) => ({ area: a.area, note: describeWeakness(a), confidence: a.confidence })),
    keyPlayers: deriveKeyPlayers(squad),
    setPieceFindings: deriveSetPieceFindings(areas, knowledgeConfidence),
  };
};
