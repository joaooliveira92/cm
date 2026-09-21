/**
 * Substitution counts and a substitution command's outcome, read off the re-derived timeline and the
 * journal. Pure. The engine's runtime counters are not in the timeline, so this module rebuilds them
 * by the engine's own rules (`applyCommand` in `packages/game-engine/src/match/simulate/teamState.ts`):
 *
 * - a goalkeeper stand-in spends nothing;
 * - every other Substitution spends one substitution;
 * - a Substitution opens a window when its half and minute differ from those of the last window
 *   opened (first-half stoppage runs past minute 45, so the minute alone would not do), except a
 *   halftime instruction, which neither opens a window nor moves that point.
 */
import { SubstitutionStatusView, type ClubId, type PlayerId } from "@cm-clone/contracts";
import {
  MAX_SUBSTITUTIONS_PER_TEAM,
  MAX_SUBSTITUTION_WINDOWS_PER_TEAM,
  type MatchEvent,
  type SubstitutionEvent,
} from "@cm-clone/game-engine";
import type { StreamEvent } from "../season/decider.js";
import { HALFTIME_MINUTE, lineupFacts, type LineupCommand } from "./pitch.js";
import { journaledLineupCommands, matchStartedOf } from "./stream.js";

/**
 * The Substitutions that spend a substitution and that a read at `revealedEvents` counts (null: the
 * whole match). Goalkeeper stand-ins are left out.
 *
 * Forced substitutions count once revealed. The manager's own count once journaled, wherever they sit:
 * the engine applies a command at the start of its minute, so a second command in the same minute,
 * or one stamped minute 1 before anything is revealed, lands at or past `revealedEvents` and a
 * position cut would drop it. So a manager substitution can count ahead of the reveal: a halftime
 * instruction counts from when it was given (group-g-match-day tickets 18, 23, 24).
 */
export const countedSubstitutions = (
  events: ReadonlyArray<MatchEvent>,
  standIns: ReadonlySet<SubstitutionEvent>,
  revealedEvents: number | null,
): ReadonlyArray<SubstitutionEvent> =>
  events.filter(
    (event, index): event is SubstitutionEvent =>
      event._tag === "Substitution" &&
      !standIns.has(event) &&
      (revealedEvents === null || index < revealedEvents || !event.forcedByInjury),
  );

interface WindowLedger {
  windowsUsed: number;
  lastWindow: SubstitutionEvent | null;
}

/** Whether `event` falls in the last window opened: the same half and minute. */
const inLastWindow = (ledger: WindowLedger, event: SubstitutionEvent): boolean =>
  ledger.lastWindow !== null && ledger.lastWindow.half === event.half && ledger.lastWindow.minute === event.minute;

/** The engine's window step for a non-halftime substitution it accepted. */
const spendWindow = (ledger: WindowLedger, event: SubstitutionEvent): void => {
  if (inLastWindow(ledger, event)) return;
  ledger.windowsUsed += 1;
  ledger.lastWindow = event;
};

interface SubstitutionPair {
  readonly clubId: ClubId;
  readonly outPlayerId: PlayerId;
  readonly inPlayerId: PlayerId;
}

const samePair = (event: SubstitutionEvent, command: SubstitutionPair): boolean =>
  event.teamClubId === command.clubId && event.outPlayerId === command.outPlayerId && event.inPlayerId === command.inPlayerId;

/** What the engine had spent for one club at a point of the timeline. */
interface ClubLedger extends WindowLedger {
  substitutionsUsed: number;
}

/** Whether `applyCommand` would refuse a live substitution at `event`'s half and minute for its caps alone. */
const capRefuses = (ledger: ClubLedger, event: SubstitutionEvent): boolean =>
  ledger.substitutionsUsed >= MAX_SUBSTITUTIONS_PER_TEAM ||
  (!inLastWindow(ledger, event) && ledger.windowsUsed >= MAX_SUBSTITUTION_WINDOWS_PER_TEAM);

/** Which of a match's Substitutions are goalkeeper stand-ins, and which are halftime instructions. */
export interface SubstitutionRoles {
  /**
   * The goalkeeper stand-ins: forced Substitutions that move an outfield player already on the pitch
   * into goal when the last goalkeeper leaves with no substitute to replace them. The engine spends no
   * substitution and no window on them, and the team is a player down.
   */
  readonly standIns: ReadonlySet<SubstitutionEvent>;
  /** The manager's Substitutions that are halftime instructions, which spend no window. */
  readonly halftime: ReadonlySet<SubstitutionEvent>;
}

/**
 * Classifies a whole match's Substitutions by replaying the engine's counters per club, in timeline
 * order (`forcePlayerOff`, `emptySlot`, `applyForcedOff` and `applyCommand` in
 * `packages/game-engine/src/match/simulate/teamState.ts`).
 *
 * A forced Substitution comes from one of two places. A severe Injury calls `forcePlayerOff`, which
 * records the Injury and then, as the very next event, either the bench substitution or, when that is
 * refused, the stand-in `emptySlot` drags into goal. So one right after its player's severe Injury is
 * a stand-in when the caps refuse the bench path, or when no one was left on the bench — the one fact
 * the counters cannot give, taken from the pitch fold (`benchless`). Any other forced Substitution is
 * a bring-off's stand-in: `applyForcedOff` never tries the bench. Reading this off the counters
 * rather than off who the fold has on the pitch keeps it right after a live tactics change moves
 * players the fold does not follow.
 *
 * A halftime instruction and a live command stamped minute 45 (one given in first-half stoppage) both
 * emit a Substitution at minute 45 of the first half, and when minute 45 and stoppage bring no other
 * event the two sit side by side. The journal tells them apart: in timeline order, a minute-45
 * Substitution is the live command's when a journaled minute-45 live command of the same pair is still
 * unmatched and the engine had a window for it; otherwise it is a halftime instruction. The engine
 * applies the live commands first, so matching in order is its order.
 */
export const classifySubstitutions = (
  events: ReadonlyArray<MatchEvent>,
  lineupCommands: ReadonlyArray<LineupCommand>,
  benchless: ReadonlySet<SubstitutionEvent>,
): SubstitutionRoles => {
  const standIns = new Set<SubstitutionEvent>();
  const halftime = new Set<SubstitutionEvent>();
  const ledgers = new Map<ClubId, ClubLedger>();
  const liveAt45 = lineupCommands.filter(
    (command) => command._tag === "SubstitutionMade" && !command.isHalftime && command.minute === HALFTIME_MINUTE,
  );
  let firstHalf = true;

  for (const [index, event] of events.entries()) {
    if (event._tag === "HalfTimeReached") firstHalf = false;
    if (event._tag !== "Substitution") continue;
    const ledger = ledgers.get(event.teamClubId) ?? { substitutionsUsed: 0, windowsUsed: 0, lastWindow: null };
    ledgers.set(event.teamClubId, ledger);

    if (event.forcedByInjury) {
      const previous = events[index - 1];
      const afterSevereInjury =
        previous?._tag === "Injury" &&
        previous.tier === "red" &&
        previous.teamClubId === event.teamClubId &&
        previous.playerId === event.outPlayerId &&
        previous.minute === event.minute;
      if (!afterSevereInjury || capRefuses(ledger, event) || benchless.has(event)) {
        standIns.add(event);
        continue;
      }
    } else if (firstHalf && event.minute === HALFTIME_MINUTE) {
      const live = liveAt45.findIndex((command) => command._tag === "SubstitutionMade" && samePair(event, command));
      if (live === -1 || capRefuses(ledger, event)) {
        halftime.add(event);
        ledger.substitutionsUsed += 1;
        continue;
      }
      liveAt45.splice(live, 1);
    }
    ledger.substitutionsUsed += 1;
    spendWindow(ledger, event);
  }
  return { standIns, halftime };
};

/** One club's substitution counts from the Substitutions a read counts, in timeline order. */
export const substitutionStatus = (
  clubId: ClubId,
  counted: ReadonlyArray<SubstitutionEvent>,
  halftime: ReadonlySet<SubstitutionEvent>,
): SubstitutionStatusView => {
  const subs = counted.filter((event) => event.teamClubId === clubId);
  const used = subs.length;
  const ledger: WindowLedger = { windowsUsed: 0, lastWindow: null };
  for (const sub of subs) if (!halftime.has(sub)) spendWindow(ledger, sub);
  const { windowsUsed } = ledger;

  return new SubstitutionStatusView({
    used,
    remaining: Math.max(0, MAX_SUBSTITUTIONS_PER_TEAM - used),
    windowsUsed,
    windowsRemaining: Math.max(0, MAX_SUBSTITUTION_WINDOWS_PER_TEAM - windowsUsed),
    capReached: used >= MAX_SUBSTITUTIONS_PER_TEAM || windowsUsed >= MAX_SUBSTITUTION_WINDOWS_PER_TEAM,
  });
};

/** Everything a read needs to count a match's substitutions, from its stream and derived timeline. */
export const substitutionLedger = (stream: ReadonlyArray<StreamEvent>, events: ReadonlyArray<MatchEvent>) => {
  const kickoff = matchStartedOf(stream);
  const lineupCommands = journaledLineupCommands(stream);
  const { benchless, forceOffApplied } = lineupFacts([kickoff.homeSetup, kickoff.awaySetup], events, lineupCommands);
  return { ...classifySubstitutions(events, lineupCommands, benchless), forceOffApplied, lineupCommands };
};

export type SubstitutionLedger = ReturnType<typeof substitutionLedger>;

/**
 * Whether a submitted `MakeSubstitution` took effect. The engine applies the commands at one point
 * (a minute, or half time) in journal order and emits one Substitution for each it accepts, so this
 * one was applied when the timeline holds as many Substitutions of the pair at that point as the
 * journal holds commands, this one included. Submitting the same pair twice in a minute is refused
 * the second time, and reads so.
 */
export const substitutionApplied = (
  events: ReadonlyArray<MatchEvent>,
  ledger: Pick<SubstitutionLedger, "halftime" | "lineupCommands">,
  command: SubstitutionPair,
  minute: number,
  isHalftime: boolean,
): boolean => {
  const emitted = events.filter(
    (event) =>
      event._tag === "Substitution" &&
      !event.forcedByInjury &&
      samePair(event, command) &&
      (isHalftime ? ledger.halftime.has(event) : event.minute === minute && !ledger.halftime.has(event)),
  ).length;
  const journaled = ledger.lineupCommands.filter(
    (entry) =>
      entry._tag === "SubstitutionMade" &&
      entry.clubId === command.clubId &&
      entry.outPlayerId === command.outPlayerId &&
      entry.inPlayerId === command.inPlayerId &&
      entry.isHalftime === isHalftime &&
      (isHalftime || entry.minute === minute),
  ).length;
  return emitted === journaled;
};
