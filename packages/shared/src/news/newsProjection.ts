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

import {
  NEWS_CATEGORIES,
  project,
  type BidStatuses,
  type NewsActionState,
  type NewsCategory,
  type NewsClubContext,
  type NewsPriority,
  type NewsSourceEvent,
} from "./newsCopy.js";

// The news vocabulary is declared in `./newsCopy.js` — it is what the copy table produces — and
// re-exported here so `@cm-clone/shared` still surfaces the whole inbox model from one module.
export { NEWS_CATEGORIES };
export type {
  BidStatuses,
  NewsActionState,
  NewsCategory,
  NewsClubContext,
  NewsPriority,
  NewsSourceEvent,
};

/** Archived is a terminal display state rather than a third read state: an archived message is out
 * of the inbox whether or not it was ever read, which is why `state` collapses the two. */
export type NewsReadState = "unread" | "read" | "archived";

/** The per-message user state held in `news_message_state`. Absent means untouched — unread, not
 * archived, not flagged — so the table stays empty until the manager acts on something. */
export interface NewsMessageState {
  readonly read: boolean;
  readonly archived: boolean;
  readonly flagged: boolean;
}

const UNTOUCHED: NewsMessageState = { read: false, archived: false, flagged: false };

/** A projected message. Immutable, serializable, and addressed by `messageId`. */
export interface NewsMessage {
  readonly messageId: string;
  readonly category: NewsCategory;
  readonly priority: NewsPriority;
  readonly state: NewsReadState;
  readonly actionState: NewsActionState;
  readonly flagged: boolean;
  readonly subject: string;
  readonly body: string;
  readonly seasonNumber: number | null;
  /** The in-world date this message belongs to, ISO `YYYY-MM-DD`, or `null` for a message the
   *  calendar does not place. */
  readonly date: string | null;
  /** The log's wall-clock `created_at`, which orders messages and is not an in-world date. */
  readonly occurredAt: string;
  readonly seq: number;
  /** Where this message sits in the log's global append order — what breaks a `occurredAt` tie
   *  across two streams. Falls back to `seq` when the source did not carry one. */
  readonly ordinal: number;
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

const readState = (state: NewsMessageState): NewsReadState =>
  state.archived ? "archived" : state.read ? "read" : "unread";

/** Projects one event into a message, or `null` where the event carries no news. */
export const projectNewsMessage = (
  event: NewsSourceEvent,
  state: NewsMessageState,
  club: NewsClubContext,
  bidStatuses: BidStatuses = new Map(),
): NewsMessage | null => {
  const projected = project(event, club, bidStatuses);
  if (projected === null) return null;
  return {
    messageId: newsMessageId(event),
    category: projected.category,
    priority: projected.priority,
    state: readState(state),
    actionState: projected.actionState ?? "none",
    flagged: state.flagged,
    subject: projected.subject,
    body: projected.body,
    seasonNumber: projected.seasonNumber,
    date: projected.date,
    occurredAt: event.createdAt,
    seq: event.seq,
    ordinal: event.ordinal ?? event.seq,
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
  bidStatuses: BidStatuses = new Map(),
): ReadonlyArray<NewsMessage> => {
  const messages: Array<NewsMessage> = [];
  for (const event of events) {
    const message = projectNewsMessage(
      event,
      states.get(newsMessageId(event)) ?? UNTOUCHED,
      club,
      bidStatuses,
    );
    if (message !== null) messages.push(message);
  }
  return messages.sort((a, b) =>
    a.occurredAt === b.occurredAt ? b.ordinal - a.ordinal : a.occurredAt < b.occurredAt ? 1 : -1,
  );
};

// ---------------------------------------------------------------------------
// Filtering and counting
// ---------------------------------------------------------------------------

/** The four inbox views. `all` means the live inbox — read and unread, archived excluded — because
 * archiving exists precisely to take a message out of the default list. */
export type NewsView = "all" | "unread" | "action" | "flagged" | "archived";

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
  readonly actionState: NewsActionState;
  readonly flagged: boolean;
  readonly subject: string;
  readonly body: string;
}

/** The minimum a message needs to be counted. */
export interface CountableNewsMessage {
  readonly state: NewsReadState;
  readonly actionState: NewsActionState;
  readonly flagged: boolean;
  readonly priority: NewsPriority;
}

const matchesView = (message: FilterableNewsMessage, view: NewsView): boolean => {
  switch (view) {
    case "all":
      return message.state !== "archived";
    case "unread":
      return message.state === "unread";
    // Archived is deliberately not excluded here: archiving a message does not answer the decision
    // it carries, and an open decision the manager filed away is exactly the one worth finding.
    case "action":
      return message.actionState === "required";
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
  /** Decisions still open. Counted across archived messages too, for the reason `matchesView`
   *  gives: filing a decision away does not answer it. */
  readonly actionRequired: number;
  readonly flagged: number;
  readonly archived: number;
  readonly highPriorityUnread: number;
}

/** Counts over the whole inbox, never over the filtered result — the header's unread count must not
 * move when the manager narrows the list. */
export const countNews = (messages: ReadonlyArray<CountableNewsMessage>): NewsCounts => {
  let total = 0;
  let unread = 0;
  let actionRequired = 0;
  let flagged = 0;
  let archived = 0;
  let highPriorityUnread = 0;
  for (const message of messages) {
    if (message.actionState === "required") actionRequired += 1;
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
  return { total, unread, actionRequired, flagged, archived, highPriorityUnread };
};
