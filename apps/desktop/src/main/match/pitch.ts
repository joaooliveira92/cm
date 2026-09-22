/**
 * Who is on the pitch, and who may still come on, as of the revealed position — the source the
 * substitution pickers read (group-g-match-day ticket 19). Pure: a fold of the kickoff setup over
 * the re-derived `MatchEvent` timeline and the journaled bring-offs.
 */
import { MatchPitchView, PitchSlotView, type ClubId, type PlayerId } from "@cm-clone/contracts";
import type { MatchEvent, MatchTeamSetup, SubstitutionEvent } from "@cm-clone/game-engine";
import type { PersistedForcedOff, PersistedSubstitutionMade } from "./stream.js";

/** `simulateMatch`'s half length: halftime commands are applied at this minute, and first-half
 *  minutes end here. */
export const HALFTIME_MINUTE = 45;

export type LineupCommand = PersistedSubstitutionMade | PersistedForcedOff;

/** Whether `event` is the Substitution a journaled command emitted: a manager substitution's own,
 *  or the goalkeeper stand-in a bring-off of the last goalkeeper drags in. */
const emittedBy = (event: SubstitutionEvent, command: LineupCommand): boolean =>
  event.teamClubId === command.clubId &&
  (command._tag === "SubstitutionMade"
    ? !event.forcedByInjury && event.outPlayerId === command.outPlayerId && event.inPlayerId === command.inPlayerId
    : event.forcedByInjury && event.outPlayerId === command.playerId);

/**
 * The first event at or past the start of a command's minute — before that minute's events — or,
 * for a halftime command, `HalfTimeReached`; the timeline's length if none is.
 */
const minuteStart = (events: ReadonlyArray<MatchEvent>, command: PersistedForcedOff): number => {
  const index = events.findIndex((event) => {
    switch (event._tag) {
      case "MatchStarted":
        return false;
      case "HalfTimeReached":
        return command.isHalftime || command.minute <= HALFTIME_MINUTE;
      case "FullTimeWhistle":
        return true;
      case "Goal":
      case "ShotOnTarget":
      case "ShotMissed":
      case "BigChance":
      case "YellowCard":
      case "RedCard":
      case "Injury":
      case "Substitution":
        if (command.isHalftime) return false;
        return command.minute <= HALFTIME_MINUTE
          ? event.half === 2 || event.minute >= command.minute
          : event.half === 2 && event.minute >= command.minute;
    }
  });
  return index === -1 ? events.length : index;
};

/**
 * The timeline position the bring-off at `commands[position]` is applied at. The engine applies a
 * minute's commands in journal order, each emitting its Substitution as it goes, so a bring-off
 * lands after the Substitutions of the same minute's commands journaled before it: bringing off a
 * player brought on earlier that minute must follow their substitution. A halftime bring-off sits
 * at `HalfTimeReached`, after every halftime Substitution, which no halftime order contradicts.
 */
const appliedAt = (events: ReadonlyArray<MatchEvent>, commands: ReadonlyArray<LineupCommand>, position: number): number => {
  const command = commands[position] as PersistedForcedOff;
  let index = minuteStart(events, command);
  if (command.isHalftime) return index;
  const earlier = commands.slice(0, position).filter((other) => !other.isHalftime && other.minute === command.minute);
  while (index < events.length) {
    const event = events[index]!;
    if (event._tag !== "Substitution" || event.minute !== command.minute) break;
    const source = earlier.findIndex((other) => emittedBy(event, other));
    if (source === -1) break;
    earlier.splice(source, 1);
    index++;
  }
  return index;
};

/** What a fold of one club's pitch learns on the way: who is on and who has been on, and two facts
 *  about the manager's commands that no Match Event states outright. */
interface PitchFold {
  readonly slots: ReadonlyArray<{ readonly playerId: PlayerId; readonly position: PitchSlotView["position"] }>;
  readonly beenOn: ReadonlySet<PlayerId>;
  /** The forced Substitutions that bring on a player who had already been on the pitch: a goalkeeper
   *  stand-in, never a bench substitute, since `forcePlayerOff` only brings on a named bench player
   *  who has never been on (group-g-match-day ticket 26). */
  readonly benchless: ReadonlySet<SubstitutionEvent>;
  /** Each of the club's bring-offs, by position in the journaled lineup commands, and whether the
   *  player was on the pitch when it was applied. */
  readonly forceOffApplied: ReadonlyMap<number, boolean>;
}

const foldPitch = (
  setup: MatchTeamSetup,
  events: ReadonlyArray<MatchEvent>,
  lineupCommands: ReadonlyArray<LineupCommand>,
  revealedEvents: number | null,
): PitchFold => {
  const clubId: ClubId = setup.clubId;
  let slots = setup.tactic.slots.map((slot) => ({ playerId: slot.playerId, position: slot.position }));
  const beenOn = new Set<PlayerId>(slots.map((slot) => slot.playerId));
  const standInsOfCommands = new Set<SubstitutionEvent>();
  const benchless = new Set<SubstitutionEvent>();
  const forceOffApplied = new Map<number, boolean>();

  const pendingForceOffs = lineupCommands.flatMap((command, position) =>
    command._tag === "ForceOffMade" && command.clubId === clubId
      ? [{ command, position, at: appliedAt(events, lineupCommands, position) }]
      : [],
  );

  const isOn = (playerId: PlayerId): boolean => slots.some((slot) => slot.playerId === playerId);

  const takeOff = (playerId: PlayerId): void => {
    slots = slots.filter((slot) => slot.playerId !== playerId);
  };

  const substitute = (event: SubstitutionEvent): void => {
    // The engine emitted it, so the player has been on even where the fold lost track of the slot.
    beenOn.add(event.inPlayerId);
    const outIndex = slots.findIndex((slot) => slot.playerId === event.outPlayerId);
    if (outIndex === -1) return;
    // A goalkeeper stand-in is already on the pitch: they move into the vacated slot, leaving their own empty.
    slots = slots
      .map((slot, index) => (index === outIndex ? { ...slot, playerId: event.inPlayerId } : slot))
      .filter((slot, index) => index === outIndex || slot.playerId !== event.inPlayerId);
  };

  for (let index = 0; index <= events.length; index++) {
    for (const { command, position, at } of pendingForceOffs) {
      if (at !== index) continue;
      // The engine refuses a bring-off of a player who is not on the pitch, and records nothing.
      forceOffApplied.set(position, isOn(command.playerId));
      const standIn = events
        .slice(index)
        .find(
          (event): event is SubstitutionEvent =>
            event._tag === "Substitution" && event.teamClubId === clubId && event.outPlayerId === command.playerId,
        );
      if (standIn !== undefined && standIn.forcedByInjury && standIn.minute === (command.isHalftime ? HALFTIME_MINUTE : command.minute)) {
        standInsOfCommands.add(standIn);
      } else {
        takeOff(command.playerId);
      }
    }
    const event = events[index];
    if (event === undefined) break;
    const revealed = revealedEvents === null || index < revealedEvents;
    if (
      ((event._tag === "Injury" && event.tier === "red") || event._tag === "RedCard") &&
      event.teamClubId === clubId &&
      revealed
    ) {
      // A severe Injury or a red card forces the player off. The engine records the forced
      // Substitution as the very next event, which moves them off once revealed: an Injury's bench
      // substitute or stand-in, or the stand-in a sent-off last goalkeeper drags into goal (ticket
      // 36). With none, they leave to ten men here.
      const next = events[index + 1];
      const replaced =
        next?._tag === "Substitution" && next.forcedByInjury && next.teamClubId === clubId && next.outPlayerId === event.playerId;
      if (!replaced) takeOff(event.playerId);
    }
    if (
      event._tag === "Substitution" &&
      event.forcedByInjury &&
      event.teamClubId === clubId &&
      beenOn.has(event.inPlayerId)
    ) {
      // `forcePlayerOff` brings on only a named bench player who has never been on, so a forced
      // Substitution bringing on someone who has is the stand-in `emptySlot` drags into goal.
      benchless.add(event);
    }
    if (
      event._tag === "Substitution" &&
      event.teamClubId === clubId &&
      (revealed || !event.forcedByInjury || standInsOfCommands.has(event))
    ) {
      substitute(event);
    }
  }

  return { slots, beenOn, benchless, forceOffApplied };
};

/**
 * One club's pitch after the first `revealedEvents` Match Events (null: the whole match).
 *
 * The cut is the substitution counts' rule (`countedSubstitutions` in `substitutions.ts`): a red card, a
 * severe Injury or a forced substitution counts only once revealed, while the manager's own substitutions and
 * bring-offs count once journaled, because the engine applies a command at the start of its minute
 * and a position cut would drop one given in a minute already partly shown. A bring-off of the last
 * goalkeeper also emits a forced Substitution moving an outfield player in goal; that event belongs
 * to the command, so it counts with it.
 *
 * `substitutes` is the kickoff Tactic's named bench, in bench order, minus anyone not in the match
 * squad and everyone who has been on the pitch: the players the engine would accept coming on
 * (`applyCommand`, decision request 04, ticket 35). A player substituted off, sent off, injured off
 * or brought off does not come back on.
 *
 * The fold assumes a live `ChangeTactics` does not change who is on the pitch; see
 * `.scratch/group-g-match-day/decision-request-01-live-change-tactics-scope.md`.
 */
export const pitchAsOf = (
  setup: MatchTeamSetup,
  events: ReadonlyArray<MatchEvent>,
  lineupCommands: ReadonlyArray<LineupCommand>,
  revealedEvents: number | null,
): MatchPitchView => {
  const { slots, beenOn } = foldPitch(setup, events, lineupCommands, revealedEvents);
  return new MatchPitchView({
    onPitch: slots.map((slot) => new PitchSlotView(slot)),
    substitutes: setup.tactic.bench.filter(
      (id): id is PlayerId => id !== null && !beenOn.has(id) && setup.squad.some((player) => player.id === id),
    ),
  });
};

/** Facts about the whole match's lineup changes, for both clubs. */
export interface LineupFacts {
  /**
   * The forced Substitutions that bring on someone who has already been on the pitch (a stand-in
   * dragged into goal, including after a cap-refused substitution or a bring-off): the one input to
   * telling a goalkeeper stand-in apart (`classifySubstitutions` in `substitutions.ts`) the engine's
   * counters cannot give.
   * Read off who comes on rather than off the bench: the engine brings on only a named bench player
   * who has never been on the pitch (`forcePlayerOff`, ticket 26), while a stand-in is already on it.
   * The fold does not follow a live tactics change (decision request 01), so a stand-in whom one put
   * on the pitch reads as a substitution.
   */
  readonly benchless: ReadonlySet<SubstitutionEvent>;
  /** Whether each journaled bring-off took its player off the pitch, by position in the lineup commands. */
  readonly forceOffApplied: ReadonlyMap<number, boolean>;
}

/** Folds both clubs' pitches over the whole match. An empty bench, or an applied bring-off, does not
 *  depend on how much of the match is revealed. */
export const lineupFacts = (
  setups: ReadonlyArray<MatchTeamSetup>,
  events: ReadonlyArray<MatchEvent>,
  lineupCommands: ReadonlyArray<LineupCommand>,
): LineupFacts => {
  const benchless = new Set<SubstitutionEvent>();
  const forceOffApplied = new Map<number, boolean>();
  for (const setup of setups) {
    const fold = foldPitch(setup, events, lineupCommands, null);
    for (const event of fold.benchless) benchless.add(event);
    for (const [position, applied] of fold.forceOffApplied) forceOffApplied.set(position, applied);
  }
  return { benchless, forceOffApplied };
};
