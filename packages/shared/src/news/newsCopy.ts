/**
 * Inbox copy: the table that turns one logged event into the words a manager reads.
 *
 * Split out of `./newsProjection.js`, which owns the vocabulary and the projection around this
 * table. Copy changes for editorial reasons and on its own schedule, so it is worth reading and
 * reviewing without the projection machinery around it.
 *
 * The news vocabulary — the categories, priorities, and action states copy assigns, and the event
 * row it reads — is declared here rather than beside the projection, because this table is what
 * decides those values. `./newsProjection.js` re-exports them, so the package surface is unchanged
 * and the dependency runs one way: projection -> copy.
 */

/** The kinds of career event that carry news. Stable identifiers: they appear in filter state and
 * are never matched on display copy. */
export const NEWS_CATEGORIES = ["board", "season", "transfer", "result", "development"] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
/** `high` is reserved for messages a manager cannot afford to skim past — a board warning, a
 * dismissal, a missed objective. Priority is never communicated by colour alone at the surface. */
export type NewsPriority = "normal" | "high";
/**
 * Whether a message is waiting on the manager.
 *
 * Almost every message is a record of something that already happened, and carries `none`. The one
 * exception is a Bid for one of this club's players: it is the only thing in the simulation that
 * waits, because every other AI action resolves inside the command that triggered it.
 *
 * This is derived live from the `bids` row rather than stored on the message, so the inbox can
 * never claim a decision is open after it has been answered.
 */
export type NewsActionState = "none" | "required" | "completed" | "expired";
/** The live status of a Bid the inbox has a message about, keyed by Bid id. */
export type BidStatuses = ReadonlyMap<string, string>;
/** One row of the `events` log, as the inbox query returns it. */
export interface NewsSourceEvent {
  readonly streamType: string;
  readonly streamId: string;
  readonly seq: number;
  readonly tag: string;
  readonly payload: unknown;
  readonly createdAt: string;
  /** The log's global append order (SQLite's `rowid`). `seq` cannot order the inbox on its own: it
   *  counts within one stream, so the Season stream's seq 1 and the club stream's seq 1 are not
   *  comparable, and `created_at` ties them whenever two events land in the same second — which is
   *  every advance. Optional so callers that only ever pass one stream need not supply it. */
  readonly ordinal?: number;
}
/** Whose inbox this is. The projection needs the manager's club to say "you won" rather than
 * reciting two club ids, and to name the club in board copy. */
export interface NewsClubContext {
  readonly clubId: string | null;
  readonly clubName: string;
}

// ---------------------------------------------------------------------------
// Payload narrowing
//
// Payloads are JSON read back out of the save. They are this app's own writes, but a payload that
// disagrees with its tag is a corrupt or older save rather than something to render, so every read
// below is guarded and a mismatch drops the message instead of producing copy over `undefined`.
// ---------------------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const str = (value: unknown): string | null => (typeof value === "string" ? value : null);

interface Fixture {
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
}

const fixture = (value: unknown): Fixture | null => {
  if (!isRecord(value)) return null;
  const homeClubId = str(value["homeClubId"]);
  const awayClubId = str(value["awayClubId"]);
  const homeGoals = num(value["homeGoals"]);
  const awayGoals = num(value["awayGoals"]);
  if (homeClubId === null || awayClubId === null || homeGoals === null || awayGoals === null) {
    return null;
  }
  return { homeClubId, awayClubId, homeGoals, awayGoals };
};

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

/** What one tag becomes: everything the message needs beyond its identity and user state. A tag
 * with no news meaning returns `null` and is skipped, which is also what a payload that fails its
 * guard produces. */
interface Projected {
  readonly category: NewsCategory;
  readonly priority: NewsPriority;
  readonly subject: string;
  readonly body: string;
  readonly seasonNumber: number | null;
  readonly date: string | null;
  /** Omitted for the messages that are pure record, which is all of them but one. */
  readonly actionState?: NewsActionState;
}

const matchdayResolvedMessage = (
  payload: Record<string, unknown>,
  club: NewsClubContext,
): Projected | null => {
  const date = str(payload["date"]);
  if (date === null) return null;
  const rawResults = payload["results"];
  const results = Array.isArray(rawResults)
    ? rawResults.map((entry) => fixture(entry)).filter((entry): entry is Fixture => entry !== null)
    : [];

  const own =
    club.clubId === null
      ? undefined
      : results.find(
          (result) => result.homeClubId === club.clubId || result.awayClubId === club.clubId,
        );

  const body = (() => {
    if (own === undefined) {
      return `${plural(results.length, "fixture", "fixtures")} resolved. ${club.clubName} did not play.`;
    }
    const atHome = own.homeClubId === club.clubId;
    const scored = atHome ? own.homeGoals : own.awayGoals;
    const conceded = atHome ? own.awayGoals : own.homeGoals;
    const outcome = scored > conceded ? "won" : scored < conceded ? "lost" : "drew";
    const venue = atHome ? "at home" : "away";
    return `${club.clubName} ${outcome} ${scored}-${conceded} ${venue}. ${plural(results.length, "fixture", "fixtures")} resolved on the day.`;
  })();

  return {
    category: "result",
    priority: "normal",
    subject: `Results for ${date}`,
    body,
    seasonNumber: null,
    date,
  };
};

const boardVerdictMessage = (payload: Record<string, unknown>): Projected | null => {
  const seasonNumber = num(payload["seasonNumber"]);
  const verdict = str(payload["verdict"]);
  if (seasonNumber === null || verdict === null) return null;
  const finalPosition = num(payload["finalPosition"]);
  const band = isRecord(payload["band"]) ? payload["band"] : null;
  const minPosition = band === null ? null : num(band["minPosition"]);
  const maxPosition = band === null ? null : num(band["maxPosition"]);

  const placing = finalPosition === null ? "The season" : `A finish of ${finalPosition}th`;
  const target =
    minPosition === null || maxPosition === null
      ? "the board's target"
      : `the board's target of ${minPosition}-${maxPosition}`;

  return {
    category: "board",
    priority: verdict === "missed" ? "high" : "normal",
    subject: `Board verdict on season ${seasonNumber}`,
    body: `${placing} against ${target}. The board's verdict is "${verdict}".`,
    seasonNumber,
    date: null,
  };
};

const seasonScoped = (
  payload: Record<string, unknown>,
  build: (seasonNumber: number) => Omit<Projected, "seasonNumber" | "date">,
): Projected | null => {
  const seasonNumber = num(payload["seasonNumber"]);
  if (seasonNumber === null) return null;
  return { ...build(seasonNumber), seasonNumber, date: null };
};

const WINDOW_LABEL: Readonly<Record<string, string>> = {
  pre_season: "pre-season",
  mid_season: "mid-season",
};

const windowLabel = (payload: Record<string, unknown>): string =>
  WINDOW_LABEL[str(payload["window"]) ?? ""] ?? "transfer";

/** Currency for message copy. Deliberately not locale-aware — see the note's localization risk. */
const formatAmount = (amount: number): string =>
  amount >= 1_000_000
    ? `£${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}m`
    : `£${Math.round(amount / 1000)}k`;

/** The copy table itself: one branch per event tag. `null` where the tag carries no news. */
export const project = (
  event: NewsSourceEvent,
  club: NewsClubContext,
  bidStatuses: BidStatuses,
): Projected | null => {
  if (!isRecord(event.payload)) return null;
  const payload = event.payload;

  switch (event.tag) {
    case "SeasonStarted":
      return seasonScoped(payload, (seasonNumber) => ({
        category: "season",
        priority: "normal",
        subject: `Season ${seasonNumber} begins`,
        body: `${plural(num(payload["fixtureCount"]) ?? 0, "fixture", "fixtures")} are scheduled. ${club.clubName} starts the campaign here.`,
      }));

    case "SeasonConcluded":
      return seasonScoped(payload, (seasonNumber) => ({
        category: "season",
        priority: "normal",
        subject: `Season ${seasonNumber} is over`,
        body: `The final table is settled and the board's review follows. Player development for the season has been applied.`,
      }));

    case "TransferWindowOpened":
      return {
        category: "transfer",
        priority: "normal",
        subject: `The ${windowLabel(payload)} transfer window is open`,
        body: `Bids can be placed and received until the window closes.`,
        seasonNumber: null,
        date: str(payload["date"]),
      };

    case "TransferWindowClosed":
      return {
        category: "transfer",
        priority: "normal",
        subject: `The ${windowLabel(payload)} transfer window has closed`,
        body: `No further bids can be placed until the next window opens.`,
        seasonNumber: null,
        date: str(payload["date"]),
      };

    case "MatchdayResolved":
      return matchdayResolvedMessage(payload, club);

    case "BoardObjectiveJudged":
      return boardVerdictMessage(payload);

    case "ManagerWarned":
      return seasonScoped(payload, (seasonNumber) => ({
        category: "board",
        priority: "high",
        subject: `The board has issued a warning`,
        body: `After season ${seasonNumber} the board has recorded ${plural(num(payload["consecutiveMisses"]) ?? 0, "consecutive missed objective", "consecutive missed objectives")}. Another miss puts the job at risk.`,
      }));

    case "ManagerSacked":
      return seasonScoped(payload, (seasonNumber) => ({
        category: "board",
        priority: "high",
        subject: `${club.clubName} has terminated your contract`,
        body: `The board has dismissed you after season ${seasonNumber}, following ${plural(num(payload["consecutiveMisses"]) ?? 0, "consecutive missed objective", "consecutive missed objectives")}.`,
      }));

    case "ManagerRetired":
      return seasonScoped(payload, (seasonNumber) => ({
        category: "board",
        priority: "normal",
        subject: `You have retired from management`,
        body: `Your career ended after season ${seasonNumber}. This save is now archived.`,
      }));

    case "BidReceived": {
      const bidId = str(payload["bidId"]);
      const amount = num(payload["amount"]);
      if (bidId === null || amount === null) return null;
      const playerName = str(payload["playerName"]) ?? "One of your players";

      // Read live, never from the payload: the event records that the Bid arrived and is immutable,
      // while whether it is still open is a fact about the `bids` row that the manager changes.
      const status = bidStatuses.get(bidId);
      const actionState: NewsActionState =
        status === "pending" ? "required" : status === "expired" ? "expired" : "completed";

      const body = (() => {
        switch (actionState) {
          case "required":
            return `A club has offered ${formatAmount(amount)} for ${playerName}. Answer it on the Transfers screen — advancing the Calendar lets it lapse.`;
          case "expired":
            return `The offer of ${formatAmount(amount)} for ${playerName} lapsed without an answer. ${playerName} stays at ${club.clubName}.`;
          default:
            return `The offer of ${formatAmount(amount)} for ${playerName} has been settled.`;
        }
      })();

      return {
        category: "transfer",
        // An open decision outranks a record of one. Once answered it is ordinary news.
        priority: actionState === "required" ? "high" : "normal",
        subject:
          actionState === "required"
            ? `Transfer offer for ${playerName}`
            : `Transfer offer for ${playerName} (${actionState === "expired" ? "lapsed" : "settled"})`,
        body,
        seasonNumber: num(payload["seasonNumber"]),
        date: null,
        actionState,
      };
    }

    case "PlayerDeveloped": {
      const rawPlayers = payload["players"];
      const count = Array.isArray(rawPlayers) ? rawPlayers.length : null;
      if (count === null) return null;
      return seasonScoped(payload, (seasonNumber) => ({
        category: "development",
        priority: "normal",
        subject: `Squad development after season ${seasonNumber}`,
        body: `${plural(count, "player", "players")} at ${club.clubName} moved toward their ceiling over the close season.`,
      }));
    }

    default:
      // A tag with no news meaning — a match-stream event, or one added after this projection was
      // written. Skipped rather than rendered, so a new event tag can never surface as empty copy.
      return null;
  }
};
