import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  MalformedNewsMessageIdError,
  NewsCountsView,
  NewsInboxView,
  NewsMessageNotFoundError,
  NewsMessageView,
  type NewsMessageId,
  type SaveId,
} from "@cm-clone/contracts";
import {
  countNews,
  projectNews,
  type NewsMessageState,
  type NewsSourceEvent,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "./decider.js";
import { loadUserClub } from "./squad.js";

/**
 * News Inbox (Screens 24-26) — the career's event streams, read as messages.
 *
 * The inbox stores no messages. Its source is the append-only `events` log: the Season stream is
 * the career's narrative and the human club's stream carries `PlayerDeveloped`, so a message is a
 * projection of a row that already exists rather than a second copy of a fact. `newsProjection.ts`
 * in `@cm-clone/shared` owns the mapping and the copy, and is pure so it can be tested without a
 * database; this module is the query and the one write.
 *
 * The only writable state is `news_message_state` — read, archived, flagged, keyed by the event's
 * own coordinates. That is user state, not simulation state, which is why it is a plain table and
 * not an event.
 */

const SEASON_STREAM = "season";
const CLUB_STREAM = "club";

interface EventRow {
  readonly streamType: string;
  readonly streamId: string;
  readonly seq: number;
  readonly tag: string;
  readonly payload: string;
  readonly createdAt: string;
  readonly ordinal: number;
}

interface StateRow {
  readonly streamType: string;
  readonly streamId: string;
  readonly seq: number;
  readonly read: number;
  readonly archived: number;
  readonly flagged: number;
}

/**
 * The two streams that carry news, scoped by the club rather than by the save id.
 *
 * Selecting the Season stream by `stream_type` alone rather than by `stream_id = saveId` is
 * deliberate: the save file *is* the career, so every `season` row in it belongs to this career,
 * and matching on the id would silently return nothing if a save were ever copied under a new name.
 */
const loadNewsEvents = (clubId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<EventRow>`
      SELECT stream_type as "streamType", stream_id as "streamId", seq, tag, payload,
             created_at as "createdAt", rowid as "ordinal"
      FROM events
      WHERE stream_type = ${SEASON_STREAM}
         OR (stream_type = ${CLUB_STREAM} AND stream_id = ${clubId})
      ORDER BY created_at DESC, rowid DESC`;
    return rows;
  });

/**
 * The live status of every Bid this save holds, keyed by Bid id.
 *
 * The inbox's `BidReceived` messages read their action state from here rather than from the event
 * payload, so a decision the manager has already answered can never still read as open. Bids are
 * bounded by transfer activity rather than by world size, so this is a small table scan.
 */
const loadBidStatuses = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{
    readonly id: string;
    readonly status: string;
  }>`SELECT id, status FROM bids`;
  return new Map(rows.map((row) => [row.id, row.status]));
});

const loadMessageStates = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<StateRow>`
    SELECT stream_type as "streamType", stream_id as "streamId", seq, read, archived, flagged
    FROM news_message_state`;
  const states = new Map<string, NewsMessageState>();
  for (const row of rows) {
    states.set(`${row.streamType}:${row.streamId}:${row.seq}`, {
      read: row.read === 1,
      archived: row.archived === 1,
      flagged: row.flagged === 1,
    });
  }
  return states;
});

/**
 * A stored payload is this app's own write, but a payload that no longer parses is a corrupt or
 * older save rather than something to render. Returning `null` drops that one message; the
 * projection then skips it, which keeps one bad row from emptying the whole inbox.
 */
const parsePayload = (payload: string): unknown => {
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return null;
  }
};

const readInbox = Effect.gen(function* () {
  const club = yield* loadUserClub;
  const [rows, states, bidStatuses] = yield* Effect.all(
    [loadNewsEvents(club.id), loadMessageStates, loadBidStatuses],
    { concurrency: 1 },
  );

  const events: ReadonlyArray<NewsSourceEvent> = rows.map((row) => ({
    streamType: row.streamType,
    streamId: row.streamId,
    seq: row.seq,
    tag: row.tag,
    payload: parsePayload(row.payload),
    createdAt: row.createdAt,
    ordinal: row.ordinal,
  }));

  const messages = projectNews(
    events,
    states,
    { clubId: club.id, clubName: club.name },
    bidStatuses,
  );

  return new NewsInboxView({
    messages: messages.map(
      (message) =>
        new NewsMessageView({
          messageId: message.messageId as NewsMessageId,
          category: message.category,
          priority: message.priority,
          state: message.state,
          actionState: message.actionState,
          flagged: message.flagged,
          subject: message.subject,
          body: message.body,
          seasonNumber: message.seasonNumber,
          matchday: message.matchday,
          occurredAt: message.occurredAt,
        }),
    ),
    counts: new NewsCountsView(countNews(messages)),
  });
});

/** News Inbox query. Read-only, and safe on an archived save — a finished career still has an
 *  inbox, and its last message is usually the one that ended it. */
export const getNewsInbox = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    readInbox.pipe(
      Effect.provide(SqliteClient.layer({ filename, readonly: true })),
      Effect.scoped,
    ),
  );

interface MessageCoordinates {
  readonly streamType: string;
  readonly streamId: string;
  readonly seq: number;
}

/**
 * Splits `"<stream_type>:<stream_id>:<seq>"` back into its coordinates.
 *
 * Split from the right, not the left: a `stream_id` is a club id or a save id and may itself
 * contain a colon, whereas the stream type and the sequence never do. Splitting from the left would
 * mangle exactly the ids that are hardest to notice being mangled.
 */
export const parseNewsMessageId = (messageId: string): MessageCoordinates | null => {
  const lastColon = messageId.lastIndexOf(":");
  if (lastColon <= 0) return null;
  const firstColon = messageId.indexOf(":");
  if (firstColon === lastColon) return null;

  const streamType = messageId.slice(0, firstColon);
  const streamId = messageId.slice(firstColon + 1, lastColon);
  const rawSeq = messageId.slice(lastColon + 1);
  if (streamType.length === 0 || streamId.length === 0 || !/^\d+$/.test(rawSeq)) return null;

  return { streamType, streamId, seq: Number(rawSeq) };
};

/**
 * Mark, flag, or archive messages (Screen 24 §7 bulk actions, Screen 25's open-marks-read).
 *
 * Validation runs over every id before anything is written, so the command applies to all of its
 * messages or to none: a bulk action that quietly skipped ids would report success over work it did
 * not do. Writing is an upsert of the three flags, which makes a repeated submit a no-op rather
 * than an error — Screen 24 §19 asks for exactly that.
 *
 * An omitted patch field is left alone rather than reset, so "archive" does not silently mark a
 * message read and "mark unread" does not un-archive it.
 */
export const setNewsMessageState = (
  savesDir: string,
  saveId: SaveId,
  messageIds: ReadonlyArray<string>,
  patch: {
    readonly read?: boolean | undefined;
    readonly archived?: boolean | undefined;
    readonly flagged?: boolean | undefined;
  },
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;

      const targets: Array<MessageCoordinates> = [];
      for (const messageId of messageIds) {
        const coordinates = parseNewsMessageId(messageId);
        if (coordinates === null) {
          return yield* new MalformedNewsMessageIdError({ messageId });
        }
        const existing = yield* sql<{ readonly seq: number }>`
          SELECT seq FROM events
          WHERE stream_type = ${coordinates.streamType}
            AND stream_id = ${coordinates.streamId}
            AND seq = ${coordinates.seq}`;
        if (existing.length === 0) {
          return yield* new NewsMessageNotFoundError({ messageId });
        }
        targets.push(coordinates);
      }

      if (targets.length === 0) return;

      yield* sql.withTransaction(
        Effect.forEach(
          targets,
          (target) => applyPatch(target, patch),
          { concurrency: 1, discard: true },
        ),
      );
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

/**
 * One message's upsert. The `ON CONFLICT` clause re-applies only the columns the patch names, using
 * the incoming row's value for a named column and the stored value for an unnamed one — so a second
 * command that flags a message cannot reset the read state a first command set.
 */
const applyPatch = (
  target: MessageCoordinates,
  patch: {
    readonly read?: boolean | undefined;
    readonly archived?: boolean | undefined;
    readonly flagged?: boolean | undefined;
  },
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const read = patch.read === undefined ? 0 : patch.read ? 1 : 0;
    const archived = patch.archived === undefined ? 0 : patch.archived ? 1 : 0;
    const flagged = patch.flagged === undefined ? 0 : patch.flagged ? 1 : 0;

    const assignments = [
      patch.read === undefined ? undefined : "read = excluded.read",
      patch.archived === undefined ? undefined : "archived = excluded.archived",
      patch.flagged === undefined ? undefined : "flagged = excluded.flagged",
      "updated_at = datetime('now')",
    ].filter((assignment): assignment is string => assignment !== undefined);

    yield* sql.unsafe(
      `INSERT INTO news_message_state (stream_type, stream_id, seq, read, archived, flagged)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (stream_type, stream_id, seq) DO UPDATE SET ${assignments.join(", ")}`,
      [target.streamType, target.streamId, target.seq, read, archived, flagged],
    );
  });
