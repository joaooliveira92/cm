import { Schema } from "effect";

import { NewsMessageId } from "./ids.js";

/** The kinds of career event that carry news. Stable identifiers — filter state stores these, never
 *  display copy. Mirrors `NEWS_CATEGORIES` in `@cm-clone/shared`. */
export const NewsCategorySchema = Schema.Literals([
  "board",
  "season",
  "transfer",
  "result",
  "development",
]);
export type NewsCategory = typeof NewsCategorySchema.Type;

export const NewsPrioritySchema = Schema.Literals(["normal", "high"]);
export const NewsReadStateSchema = Schema.Literals(["unread", "read", "archived"]);

/** Whether a message is waiting on the manager. `none` for every message that records something
 *  that already happened, which is all of them but an unanswered Bid for one of this club's
 *  players — the only decision in the simulation that waits. Derived live from the `bids` row, so
 *  the inbox cannot claim a decision is open after it has been answered. */
export const NewsActionStateSchema = Schema.Literals(["none", "required", "completed", "expired"]);

/** One projected message. Immutable and fully self-describing: the renderer never re-derives copy
 *  from a tag, so message text has exactly one source. */
export class NewsMessageView extends Schema.Class<NewsMessageView>("NewsMessageView")({
  messageId: NewsMessageId,
  category: NewsCategorySchema,
  priority: NewsPrioritySchema,
  state: NewsReadStateSchema,
  actionState: NewsActionStateSchema,
  flagged: Schema.Boolean,
  subject: Schema.String,
  body: Schema.String,
  /** In-world position — the season and the date the message belongs to; `occurredAt` orders it.
   *  Either may be `null` for an event the field does not apply to. */
  seasonNumber: Schema.NullOr(Schema.Finite),
  date: Schema.NullOr(Schema.String),
  occurredAt: Schema.String,
}) {}

/** Counts over the whole inbox, never over the filtered result — narrowing the list must not move
 *  the header's unread count. `total` and `unread` exclude archived messages. */
export class NewsCountsView extends Schema.Class<NewsCountsView>("NewsCountsView")({
  total: Schema.Finite,
  unread: Schema.Finite,
  /** Open decisions. Counted across archived messages too: filing one away does not answer it. */
  actionRequired: Schema.Finite,
  flagged: Schema.Finite,
  archived: Schema.Finite,
  highPriorityUnread: Schema.Finite,
}) {}

/** The News Inbox read model. Carries every message including archived ones: filtering is a
 *  renderer-side operation over an already-loaded career narrative (a few hundred rows over a
 *  twenty-season career), so narrowing the view never costs a round trip. */
export class NewsInboxView extends Schema.Class<NewsInboxView>("NewsInboxView")({
  messages: Schema.Array(NewsMessageView),
  counts: NewsCountsView,
}) {}

/** A message id that parses but names no event in this save. Raised rather than silently skipped:
 *  a bulk action that quietly dropped ids would report success over work it did not do. */
export class NewsMessageNotFoundError extends Schema.TaggedError<NewsMessageNotFoundError>()(
  "NewsMessageNotFoundError",
  { messageId: Schema.String },
) {}

/** A message id whose shape is not `"<stream_type>:<stream_id>:<seq>"`. Distinct from
 *  `NewsMessageNotFoundError` because a malformed id is a caller defect and a missing one is a
 *  stale renderer. */
export class MalformedNewsMessageIdError extends Schema.TaggedError<MalformedNewsMessageIdError>()(
  "MalformedNewsMessageIdError",
  { messageId: Schema.String },
) {}

/** The state change a bulk inbox action applies. Every field is optional and an omitted field is
 *  left alone, so "mark read" and "archive" are the same command with different fields set. */
export const NewsMessageStatePatch = Schema.Struct({
  read: Schema.optional(Schema.Boolean),
  archived: Schema.optional(Schema.Boolean),
  flagged: Schema.optional(Schema.Boolean),
});
