/**
 * News Inbox projection — the career's event streams read as messages.
 *
 * The inbox is a **read model in this repo's sense**: a query shape over authoritative tables, not
 * a `messages` table that a projector maintains. Its source is the append-only `events` log, whose
 * Season stream already carries the career's narrative (`SeasonStarted`, the transfer-window
 * boundaries, `MatchdayResolved`, `SeasonConcluded`, `BoardObjectiveJudged`, `ManagerWarned` /
 * `Sacked` / `Retired`) and whose human-club stream carries `PlayerDeveloped`. Nothing here
 * persists a second copy of a fact the log already holds.
 *
 * The one thing the log cannot answer is whether the manager has *read* a message. Read, archived,
 * and flagged are user state, they are supplied to this module as an already-loaded map, and they
 * are the only part of the inbox that is written anywhere.
 *
 * This module is pure and takes facts rather than fetching them, so the copy, the category
 * mapping, the filters, and the counts are unit-testable with no database. It deliberately does not
 * depend on `@cm-clone/contracts` — same posture as `bestXi.ts` and `continueReadiness.ts`.
 */

/** The kinds of career event that carry news. Stable identifiers: they appear in filter state and
 * are never matched on display copy. */
export const NEWS_CATEGORIES = ["board", "season", "transfer", "result", "development"] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

/** `high` is reserved for messages a manager cannot afford to skim past — a board warning, a
 * dismissal, a missed objective. Priority is never communicated by colour alone at the surface. */
export type NewsPriority = "normal" | "high";

/** Archived is a terminal display state rather than a third read state: an archived message is out
 * of the inbox whether or not it was ever read, which is why `state` collapses the two. */
export type NewsReadState = "unread" | "read" | "archived";

/** One row of the `events` log, as the inbox query returns it. */
export interface NewsSourceEvent {
  readonly streamType: string;
  readonly streamId: string;
  readonly seq: number;
  readonly tag: string;
  readonly payload: unknown;
  readonly createdAt: string;
}

/** The per-message user state held in `news_message_state`. Absent means untouched — unread, not
 * archived, not flagged — so the table stays empty until the manager acts on something. */
export interface NewsMessageState {
  readonly read: boolean;
  readonly archived: boolean;
  readonly flagged: boolean;
}

const UNTOUCHED: NewsMessageState = { read: false, archived: false, flagged: false };

/** Whose inbox this is. The projection needs the manager's club to say "you won" rather than
 * reciting two club ids, and to name the club in board copy. */
export interface NewsClubContext {
  readonly clubId: string | null;
  readonly clubName: string;
}

/** A projected message. Immutable, serializable, and addressed by `messageId`. */
export interface NewsMessage {
  readonly messageId: string;
  readonly category: NewsCategory;
  readonly priority: NewsPriority;
  readonly state: NewsReadState;
  readonly flagged: boolean;
  readonly subject: string;
  readonly body: string;
  readonly seasonNumber: number | null;
  readonly matchday: number | null;
  /** The log's wall-clock `created_at`. The Calendar has no in-world dates yet, so the in-world
   * position of a message is carried by `seasonNumber`/`matchday` and this field is for ordering
   * only. It becomes the in-world date when `events.game_date` lands. */
  readonly occurredAt: string;
  readonly seq: number;
}

/**
 * A message's identity is where it sits in the log — stream, stream id, and sequence. Nothing mints
 * an id, so the same career event is the same message across reloads, and a message id can never
 * name an event that does not exist.
 */
export const newsMessageId = (event: {
  readonly streamType: string;
  readonly streamId: string;
  readonly seq: number;
}): string => `${event.streamType}:${event.streamId}:${event.seq}`;

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
  readonly matchday: number | null;
}

const matchdayMessage = (
  payload: Record<string, unknown>,
  club: NewsClubContext,
): Projected | null => {
  const matchday = num(payload["matchday"]);
  if (matchday === null) return null;
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
    return `${club.clubName} ${outcome} ${scored}-${conceded} ${venue}. ${plural(results.length, "fixture", "fixtures")} resolved across the matchday.`;
  })();

  return {
    category: "result",
    priority: "normal",
    subject: `Matchday ${matchday} results`,
    body,
    seasonNumber: null,
    matchday,
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
    matchday: null,
  };
};

const seasonScoped = (
  payload: Record<string, unknown>,
  build: (seasonNumber: number) => Omit<Projected, "seasonNumber" | "matchday">,
): Projected | null => {
  const seasonNumber = num(payload["seasonNumber"]);
  if (seasonNumber === null) return null;
  return { ...build(seasonNumber), seasonNumber, matchday: null };
};

const WINDOW_LABEL: Readonly<Record<string, string>> = {
  pre_season: "pre-season",
  mid_season: "mid-season",
};

const windowLabel = (payload: Record<string, unknown>): string =>
  WINDOW_LABEL[str(payload["window"]) ?? ""] ?? "transfer";

const project = (
  event: NewsSourceEvent,
  club: NewsClubContext,
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
        matchday: num(payload["afterMatchday"]),
      };

    case "TransferWindowClosed":
      return {
        category: "transfer",
        priority: "normal",
        subject: `The ${windowLabel(payload)} transfer window has closed`,
        body: `No further bids can be placed until the next window opens.`,
        seasonNumber: null,
        matchday: num(payload["matchday"]),
      };

    case "MatchdayResolved":
      return matchdayMessage(payload, club);

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

const readState = (state: NewsMessageState): NewsReadState =>
  state.archived ? "archived" : state.read ? "read" : "unread";

/** Projects one event into a message, or `null` where the event carries no news. */
export const projectNewsMessage = (
  event: NewsSourceEvent,
  state: NewsMessageState,
  club: NewsClubContext,
): NewsMessage | null => {
  const projected = project(event, club);
  if (projected === null) return null;
  return {
    messageId: newsMessageId(event),
    category: projected.category,
    priority: projected.priority,
    state: readState(state),
    flagged: state.flagged,
    subject: projected.subject,
    body: projected.body,
    seasonNumber: projected.seasonNumber,
    matchday: projected.matchday,
    occurredAt: event.createdAt,
    seq: event.seq,
  };
};

/**
 * Projects a stream of events into the inbox, newest first, dropping the ones that carry no news.
 *
 * Ordering is `(createdAt, seq)` descending. Within the Season stream — which is where almost every
 * message comes from — `seq` alone is already the career's order; `createdAt` is what interleaves
 * the human club's development messages with it.
 */
export const projectNews = (
  events: ReadonlyArray<NewsSourceEvent>,
  states: ReadonlyMap<string, NewsMessageState>,
  club: NewsClubContext,
): ReadonlyArray<NewsMessage> => {
  const messages: Array<NewsMessage> = [];
  for (const event of events) {
    const message = projectNewsMessage(
      event,
      states.get(newsMessageId(event)) ?? UNTOUCHED,
      club,
    );
    if (message !== null) messages.push(message);
  }
  return messages.sort((a, b) =>
    a.occurredAt === b.occurredAt ? b.seq - a.seq : a.occurredAt < b.occurredAt ? 1 : -1,
  );
};

// ---------------------------------------------------------------------------
// Filtering and counting
// ---------------------------------------------------------------------------

/** The four inbox views. `all` means the live inbox — read and unread, archived excluded — because
 * archiving exists precisely to take a message out of the default list. */
export type NewsView = "all" | "unread" | "flagged" | "archived";

export interface NewsFilter {
  readonly view: NewsView;
  /** An empty list is no constraint, not "match nothing" — it is the state of the category filter
   * before the manager touches it. */
  readonly categories: ReadonlyArray<NewsCategory>;
  readonly search: string;
}

export const EMPTY_NEWS_FILTER: NewsFilter = { view: "all", categories: [], search: "" };

/** The minimum a message needs to be filtered. Structural so the contract's `NewsMessageView`,
 *  which carries no `seq`, can be filtered by the same function that filters the projection. */
export interface FilterableNewsMessage {
  readonly category: NewsCategory;
  readonly state: NewsReadState;
  readonly flagged: boolean;
  readonly subject: string;
  readonly body: string;
}

/** The minimum a message needs to be counted. */
export interface CountableNewsMessage {
  readonly state: NewsReadState;
  readonly flagged: boolean;
  readonly priority: NewsPriority;
}

const matchesView = (message: FilterableNewsMessage, view: NewsView): boolean => {
  switch (view) {
    case "all":
      return message.state !== "archived";
    case "unread":
      return message.state === "unread";
    case "flagged":
      return message.flagged && message.state !== "archived";
    case "archived":
      return message.state === "archived";
  }
};

/** Applies the three filter axes conjunctively, preserving the input order and the input type. */
export const filterNews = <T extends FilterableNewsMessage>(
  messages: ReadonlyArray<T>,
  filter: NewsFilter,
): ReadonlyArray<T> => {
  const search = filter.search.trim().toLowerCase();
  return messages.filter((message) => {
    if (!matchesView(message, filter.view)) return false;
    if (filter.categories.length > 0 && !filter.categories.includes(message.category)) return false;
    if (search.length === 0) return true;
    return (
      message.subject.toLowerCase().includes(search) || message.body.toLowerCase().includes(search)
    );
  });
};

export interface NewsCounts {
  /** The live inbox size — archived messages excluded, matching the `all` view. */
  readonly total: number;
  readonly unread: number;
  readonly flagged: number;
  readonly archived: number;
  readonly highPriorityUnread: number;
}

/** Counts over the whole inbox, never over the filtered result — the header's unread count must not
 * move when the manager narrows the list. */
export const countNews = (messages: ReadonlyArray<CountableNewsMessage>): NewsCounts => {
  let total = 0;
  let unread = 0;
  let flagged = 0;
  let archived = 0;
  let highPriorityUnread = 0;
  for (const message of messages) {
    if (message.state === "archived") {
      archived += 1;
      continue;
    }
    total += 1;
    if (message.state === "unread") {
      unread += 1;
      if (message.priority === "high") highPriorityUnread += 1;
    }
    if (message.flagged) flagged += 1;
  }
  return { total, unread, flagged, archived, highPriorityUnread };
};
