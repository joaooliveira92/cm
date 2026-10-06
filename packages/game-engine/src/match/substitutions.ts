/**
 * Substitution counts and a substitution command's outcome, read off the engine's recorded Lineup
 * Frames and Lineup Journal. Pure.
 *
 * The counters are a projection of recorded facts, not a re-enactment of the engine's window rule.
 * The frame at a reveal cut already carries every change that took effect at or before it; a
 * manager's own substitution is overlaid when it was journaled after the cut, because it counts
 * once given. Each journaled substitution records whether it opened a window (`openedWindow`), set
 * where the engine's window step ran, so the projection adds them rather than replaying the
 * half/minute rule. A goalkeeper stand-in is a `standIn` entry and spends nothing.
 */
import { SubstitutionStatusView, type ClubId, type PlayerId } from "@cm-clone/contracts";
import type { StreamEvent } from "../eventStream.js";
import { MAX_SUBSTITUTIONS_PER_TEAM, MAX_SUBSTITUTION_WINDOWS_PER_TEAM } from "./commands.js";
import type { MatchEvent, SubstitutionEvent } from "./events.js";
import type { LineupCommand } from "./pitch.js";
import type { LineupJournalEntry, RuntimeFrame } from "./simulate/lineupRecording.js";
import { journaledLineupCommands } from "./stream.js";

interface SubstitutionPair {
  readonly clubId: ClubId;
  readonly outPlayerId: PlayerId;
  readonly inPlayerId: PlayerId;
}

const samePair = (event: SubstitutionEvent, command: SubstitutionPair): boolean =>
  event.teamClubId === command.clubId && event.outPlayerId === command.outPlayerId && event.inPlayerId === command.inPlayerId;

/**
 * The Substitutions that spend a substitution and that a read at `revealedEvents` counts (null: the
 * whole match). Goalkeeper stand-ins are left out.
 *
 * Forced substitutions count once revealed. The manager's own count once journaled, wherever they sit:
 * the engine applies a command at the start of its minute, so a second command in the same minute,
 * or one stamped minute 1 before anything is revealed, lands at or past `revealedEvents` and a
 * position cut would drop it. So a manager substitution can count ahead of the reveal.
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

/**
 * One club's substitution counts from the recorded Lineup Frames and Lineup Journal at a reveal
 * cut. The frame at the cut already carries the substitutions and windows the engine spent at or
 * before it; a manager substitution journaled after the cut is overlaid, because a manager's own
 * counts once given. Each overlaid substitution contributes its recorded `openedWindow` fact.
 * `revealedEvents` is a count (null: the whole match), clamped to the frames' range.
 */
export const substitutionStatus = (
  clubId: ClubId,
  frames: ReadonlyArray<RuntimeFrame>,
  journal: ReadonlyArray<LineupJournalEntry>,
  revealedEvents: number | null,
): SubstitutionStatusView => {
  const lastFrame = frames.length - 1;
  const cut = revealedEvents === null ? lastFrame : Math.min(lastFrame, Math.max(0, revealedEvents));
  const frame = cut >= 0 ? frames[cut] : undefined;
  let used = frame?.substitutionsUsed ?? 0;
  let windowsUsed = frame?.windowsUsed ?? 0;
  for (const entry of journal) {
    if (
      entry.clubId !== clubId ||
      entry.kind !== "substitution" ||
      entry.origin !== "manager" ||
      entry.appliesAt <= cut
    ) {
      continue;
    }
    used += 1;
    if (entry.openedWindow === true) windowsUsed += 1;
  }

  return new SubstitutionStatusView({
    used,
    remaining: Math.max(0, MAX_SUBSTITUTIONS_PER_TEAM - used),
    windowsUsed,
    windowsRemaining: Math.max(0, MAX_SUBSTITUTION_WINDOWS_PER_TEAM - windowsUsed),
    capReached: used >= MAX_SUBSTITUTIONS_PER_TEAM || windowsUsed >= MAX_SUBSTITUTION_WINDOWS_PER_TEAM,
  });
};

/** The Substitution a substitution or stand-in journal entry records. */
const substitutionOf = (
  substitutions: ReadonlyArray<SubstitutionEvent>,
  entry: LineupJournalEntry,
  forcedByInjury: boolean,
): SubstitutionEvent | undefined =>
  substitutions.find(
    (event) =>
      event.forcedByInjury === forcedByInjury &&
      event.teamClubId === entry.clubId &&
      event.outPlayerId === entry.outPlayerId &&
      event.inPlayerId === entry.inPlayerId,
  );

/**
 * Whether each journaled bring-off removed its player, keyed by the command's position in
 * `journaledLineupCommands(stream)`. The engine journals one manager `forceOff`/`standIn` entry per
 * `ForceOffMade` command in application order, so matching them in order rebuilds the same map the
 * pre-ticket-02 fold produced.
 */
const forceOffAppliedOf = (
  journal: ReadonlyArray<LineupJournalEntry>,
  lineupCommands: ReadonlyArray<LineupCommand>,
): ReadonlyMap<number, boolean> => {
  const managerForceOffs = journal.filter(
    (entry): entry is LineupJournalEntry & { readonly forceOffApplied: boolean } =>
      entry.origin === "manager" && entry.forceOffApplied !== undefined,
  );
  const applied = new Map<number, boolean>();
  let next = 0;
  for (const [position, command] of lineupCommands.entries()) {
    if (command._tag !== "ForceOffMade") continue;
    const entry = managerForceOffs[next];
    next += 1;
    if (entry !== undefined) applied.set(position, entry.forceOffApplied);
  }
  return applied;
};

/**
 * Everything a read needs to count a match's substitutions. The goalkeeper stand-ins and halftime
 * instructions come from the Lineup Journal's recorded roles, not from replaying the engine's
 * counters; `forceOffApplied` is the recorded bring-off outcome, keyed by command position, as
 * `apps/desktop/src/main/match/commands.ts` reads it.
 */
export const substitutionLedger = (
  stream: ReadonlyArray<StreamEvent>,
  events: ReadonlyArray<MatchEvent>,
  journal: ReadonlyArray<LineupJournalEntry>,
) => {
  const lineupCommands = journaledLineupCommands(stream);
  const substitutions = events.filter((event): event is SubstitutionEvent => event._tag === "Substitution");
  const standIns = new Set<SubstitutionEvent>();
  const halftime = new Set<SubstitutionEvent>();
  for (const entry of journal) {
    if (entry.kind === "standIn") {
      const event = substitutionOf(substitutions, entry, true);
      if (event !== undefined) standIns.add(event);
    } else if (entry.kind === "substitution" && entry.role === "halftime") {
      const event = substitutionOf(substitutions, entry, false);
      if (event !== undefined) halftime.add(event);
    }
  }
  return { standIns, halftime, forceOffApplied: forceOffAppliedOf(journal, lineupCommands), lineupCommands };
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
