/**
 * The Match Player Line: the per-player counts CM 03/04's Club Stats table shows, folded from the
 * Match Event stream (map ticket 12, decision 02).
 *
 * The match model records no pass, tackle, header or interception, so the line carries only what an
 * event backs: key passes, assists, shots, shots on target, saves, goals, fouls, offsides, cards and
 * the substitution note. A column the stream does not back is not drawn (Agent Note: the match
 * player line folds only recorded events).
 *
 * Pure and dependency-free. `packages/shared` cannot import the engine's `MatchEvent`, so the fold
 * reads a structural event shape: every `MatchEvent` satisfies it, and the caller passes the
 * timeline straight in. `MatchStarted` and the other non-counting events are ignored.
 *
 * The caller owns the squad: it supplies the starter ids (so a goalkeeper stand-in — a forced
 * substitution bringing on someone already on the pitch — is not mistaken for a substitution) and
 * joins the returned counts onto the matchday squad in slot then bench order.
 */

/** The fields the fold reads off a Match Event. A structural supertype of the engine's union. */
export interface MatchPlayerLineEvent {
  readonly _tag: string;
  readonly minute?: number;
  readonly playerId?: string;
  readonly assistPlayerId?: string;
  readonly keeperId?: string;
  readonly outPlayerId?: string;
  readonly inPlayerId?: string;
}

/** One player's folded part in a match, before it is joined onto the matchday squad. */
export interface MatchPlayerLineCounts {
  readonly keyPasses: number;
  readonly offsides: number;
  readonly fouls: number;
  readonly assists: number;
  /** Goals, shots on target and shots missed: every recorded attempt. */
  readonly shots: number;
  readonly shotsOnTarget: number;
  readonly saves: number;
  readonly goals: number;
  readonly yellowCards: number;
  readonly redCards: number;
  /** The minute the player came on, or null when they started and never returned. */
  readonly cameOnMinute: number | null;
  /** The minute the player went off, or null when they finished on the pitch. */
  readonly wentOffMinute: number | null;
}

export const EMPTY_MATCH_PLAYER_LINE_COUNTS: MatchPlayerLineCounts = {
  keyPasses: 0,
  offsides: 0,
  fouls: 0,
  assists: 0,
  shots: 0,
  shotsOnTarget: 0,
  saves: 0,
  goals: 0,
  yellowCards: 0,
  redCards: 0,
  cameOnMinute: null,
  wentOffMinute: null,
};

/** The chance-creation events a `KeyPass` sits just after; its finisher is named on the event. */
const CHANCE_TAGS: ReadonlySet<string> = new Set([
  "ThroughBall",
  "Cross",
  "LongShot",
  "RunWithBall",
  "HoldUpLayOff",
  "Counter",
]);

type MutableLine = {
  -readonly [K in keyof MatchPlayerLineCounts]: MatchPlayerLineCounts[K];
};

const blank = (): MutableLine => ({ ...EMPTY_MATCH_PLAYER_LINE_COUNTS });

/**
 * Fold a timeline into one line per player it names. `starters` is the set of kickoff player ids,
 * used only to tell a goalkeeper stand-in (a forced Substitution bringing on someone already on)
 * from a real substitution: a stand-in writes no came-on or went-off note.
 *
 * `revealedEvents` cuts the timeline at a revealed-event count (live); null folds the whole match.
 */
export const foldMatchPlayerLineCounts = (
  starters: ReadonlySet<string>,
  events: ReadonlyArray<MatchPlayerLineEvent>,
  revealedEvents: number | null,
): ReadonlyMap<string, MatchPlayerLineCounts> => {
  const included = revealedEvents === null ? events : events.slice(0, Math.max(0, revealedEvents));
  const lines = new Map<string, MutableLine>();
  const lineOf = (playerId: string): MutableLine => {
    const existing = lines.get(playerId);
    if (existing !== undefined) return existing;
    const created = blank();
    lines.set(playerId, created);
    return created;
  };
  const bump = (playerId: string, key: keyof MatchPlayerLineCounts): void => {
    const line = lineOf(playerId);
    (line[key] as number) += 1;
  };
  const beenOn = new Set<string>(starters);

  for (let index = 0; index < included.length; index++) {
    const event = included[index]!;
    switch (event._tag) {
      case "Goal": {
        if (event.playerId === undefined) break;
        bump(event.playerId, "goals");
        bump(event.playerId, "shots");
        bump(event.playerId, "shotsOnTarget");
        if (event.assistPlayerId !== undefined && event.assistPlayerId !== event.playerId) {
          bump(event.assistPlayerId, "assists");
        }
        break;
      }
      case "ShotOnTarget": {
        if (event.playerId !== undefined) {
          bump(event.playerId, "shots");
          bump(event.playerId, "shotsOnTarget");
        }
        if (event.keeperId !== undefined) bump(event.keeperId, "saves");
        break;
      }
      case "ShotMissed": {
        if (event.playerId !== undefined) bump(event.playerId, "shots");
        break;
      }
      case "KeyPass": {
        if (event.playerId === undefined) break;
        // A self-created chance is no key pass: the KeyPass sits just after the chance event, whose
        // finisher is the KeyPass's own player when one player made and took the chance.
        const previous = included[index - 1];
        const selfCreated =
          previous !== undefined && CHANCE_TAGS.has(previous._tag) && previous.playerId === event.playerId;
        if (!selfCreated) bump(event.playerId, "keyPasses");
        break;
      }
      case "Foul": {
        if (event.playerId !== undefined) bump(event.playerId, "fouls");
        break;
      }
      case "Offside": {
        if (event.playerId !== undefined) bump(event.playerId, "offsides");
        break;
      }
      case "YellowCard": {
        if (event.playerId !== undefined) bump(event.playerId, "yellowCards");
        break;
      }
      case "RedCard": {
        if (event.playerId !== undefined) bump(event.playerId, "redCards");
        break;
      }
      case "Substitution": {
        if (event.inPlayerId === undefined || event.outPlayerId === undefined || event.minute === undefined) break;
        // A stand-in is already on the pitch when the forced Substitution names them.
        if (beenOn.has(event.inPlayerId)) break;
        beenOn.add(event.inPlayerId);
        lineOf(event.inPlayerId).cameOnMinute = event.minute;
        lineOf(event.outPlayerId).wentOffMinute = event.minute;
        break;
      }
      default:
        break;
    }
  }

  return lines;
};
