import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect, Exit } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import type { NewsMessageId, SaveId } from "@cm-clone/contracts";
import { createSave } from "../src/main/saves.js";
import { advanceCalendar } from "../src/main/season/index.js";
import { getNewsInbox, parseNewsMessageId, setNewsMessageState } from "../src/main/news.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-news-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const stateRowCount = (saveId: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{
        readonly count: number,
      }>`SELECT COUNT(*) as count FROM news_message_state`;
      return rows[0]?.count ?? 0;
    }),
  );

const ids = (messageIds: ReadonlyArray<string>): ReadonlyArray<NewsMessageId> =>
  messageIds as ReadonlyArray<NewsMessageId>;

// ---------------------------------------------------------------------------
// The inbox is a projection: it exists the moment the career does
// ---------------------------------------------------------------------------

it.effect("a new career's inbox already carries its season-start message", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const inbox = yield* getNewsInbox(savesDir, save.id);

    ok(inbox.messages.length > 0, "startSeason appends SeasonStarted, so the inbox is never empty");
    const seasonStart = inbox.messages.find((message) => message.category === "season");
    ok(seasonStart, "the season-start message should be projected");
    strictEqual(seasonStart!.state, "unread");
    strictEqual(seasonStart!.seasonNumber, 1);
    ok(seasonStart!.subject.includes("Season 1"));
  }),
);

it.effect("stores no message rows — the projection is the whole read side", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* getNewsInbox(savesDir, save.id);
    strictEqual(
      yield* stateRowCount(save.id),
      0,
      "an inbox that is only read must write nothing to disk",
    );
  }),
);

it.effect("advancing the calendar adds messages without a projector running", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getNewsInbox(savesDir, save.id);

    yield* advanceCalendar(savesDir, save.id);
    const after = yield* getNewsInbox(savesDir, save.id);

    ok(
      after.messages.length > before.messages.length,
      "the advance appended events, which are the messages",
    );
    strictEqual(after.counts.unread, after.messages.length);
  }),
);

it.effect("orders the inbox newest first", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* advanceCalendar(savesDir, save.id);
    yield* advanceCalendar(savesDir, save.id);
    const inbox = yield* getNewsInbox(savesDir, save.id);

    const seqs = inbox.messages
      .filter((message) => message.category !== "development")
      .map((message) => message.messageId);
    const seasonStartIndex = inbox.messages.findIndex((message) =>
      message.subject.includes("Season 1 begins"),
    );
    strictEqual(
      seasonStartIndex,
      inbox.messages.length - 1,
      "the season's first event is its oldest message",
    );
    ok(seqs.length > 0);
  }),
);

// ---------------------------------------------------------------------------
// Read, flag, archive
// ---------------------------------------------------------------------------

it.effect("marking a message read moves it out of the unread count", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getNewsInbox(savesDir, save.id);
    const target = before.messages[0]!;

    yield* setNewsMessageState(savesDir, save.id, ids([target.messageId]), { read: true });

    const after = yield* getNewsInbox(savesDir, save.id);
    const updated = after.messages.find((message) => message.messageId === target.messageId);
    strictEqual(updated!.state, "read");
    strictEqual(after.counts.unread, before.counts.unread - 1);
    strictEqual(after.counts.total, before.counts.total, "reading does not remove a message");
  }),
);

it.effect("archiving removes a message from the live inbox but keeps it addressable", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getNewsInbox(savesDir, save.id);
    const target = before.messages[0]!;

    yield* setNewsMessageState(savesDir, save.id, ids([target.messageId]), { archived: true });

    const after = yield* getNewsInbox(savesDir, save.id);
    const updated = after.messages.find((message) => message.messageId === target.messageId);
    ok(updated, "an archived message is still returned — the archived view needs it");
    strictEqual(updated!.state, "archived");
    strictEqual(after.counts.archived, 1);
    strictEqual(after.counts.total, before.counts.total - 1);
  }),
);

it.effect("restores an archived message", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const inbox = yield* getNewsInbox(savesDir, save.id);
    const target = inbox.messages[0]!;

    yield* setNewsMessageState(savesDir, save.id, ids([target.messageId]), { archived: true });
    yield* setNewsMessageState(savesDir, save.id, ids([target.messageId]), { archived: false });

    const after = yield* getNewsInbox(savesDir, save.id);
    const updated = after.messages.find((message) => message.messageId === target.messageId);
    strictEqual(updated!.state, "unread", "restoring returns it to the state it had, not to read");
    strictEqual(after.counts.archived, 0);
  }),
);

it.effect("an omitted patch field is left alone rather than reset", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const inbox = yield* getNewsInbox(savesDir, save.id);
    const target = inbox.messages[0]!;

    yield* setNewsMessageState(savesDir, save.id, ids([target.messageId]), { read: true });
    yield* setNewsMessageState(savesDir, save.id, ids([target.messageId]), { flagged: true });

    const after = yield* getNewsInbox(savesDir, save.id);
    const updated = after.messages.find((message) => message.messageId === target.messageId);
    strictEqual(updated!.state, "read", "flagging must not clear the read state");
    strictEqual(updated!.flagged, true);
  }),
);

it.effect("applying the same patch twice is a no-op", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const inbox = yield* getNewsInbox(savesDir, save.id);
    const target = inbox.messages[0]!;

    yield* setNewsMessageState(savesDir, save.id, ids([target.messageId]), { read: true });
    const once = yield* getNewsInbox(savesDir, save.id);
    yield* setNewsMessageState(savesDir, save.id, ids([target.messageId]), { read: true });
    const twice = yield* getNewsInbox(savesDir, save.id);

    deepStrictEqual(twice.counts, once.counts);
    strictEqual(yield* stateRowCount(save.id), 1, "a repeated submit must not add a second row");
  }),
);

it.effect("marks a batch read in one command", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* advanceCalendar(savesDir, save.id);
    const before = yield* getNewsInbox(savesDir, save.id);
    ok(before.messages.length >= 2, "need at least two messages to bulk-mark");

    yield* setNewsMessageState(
      savesDir,
      save.id,
      ids(before.messages.map((message) => message.messageId)),
      { read: true },
    );

    const after = yield* getNewsInbox(savesDir, save.id);
    strictEqual(after.counts.unread, 0);
  }),
);

// ---------------------------------------------------------------------------
// Validation: a bulk action applies to all of its messages or to none
// ---------------------------------------------------------------------------

it.effect("rejects a message id that names no event", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const exit = yield* Effect.exit(
      setNewsMessageState(savesDir, save.id, ids(["season:nope:9999"]), { read: true }),
    );

    ok(Exit.isFailure(exit));
    strictEqual(yield* stateRowCount(save.id), 0);
  }),
);

it.effect("rejects a malformed message id", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const exit = yield* Effect.exit(
      setNewsMessageState(savesDir, save.id, ids(["not-a-message-id"]), { read: true }),
    );

    ok(Exit.isFailure(exit));
    strictEqual(yield* stateRowCount(save.id), 0);
  }),
);

it.effect("writes nothing when one id in a batch is bad", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const inbox = yield* getNewsInbox(savesDir, save.id);
    const good = inbox.messages[0]!.messageId;

    const exit = yield* Effect.exit(
      setNewsMessageState(savesDir, save.id, ids([good, "season:nope:9999"]), { read: true }),
    );

    ok(Exit.isFailure(exit));
    strictEqual(
      yield* stateRowCount(save.id),
      0,
      "a partial apply would report failure over work it did do",
    );
    const after = yield* getNewsInbox(savesDir, save.id);
    strictEqual(after.messages.find((message) => message.messageId === good)!.state, "unread");
  }),
);

it.effect("fails for a save that does not exist", () =>
  Effect.gen(function* () {
    const exit = yield* Effect.exit(getNewsInbox(savesDir, "no-such-save" as SaveId));
    ok(Exit.isFailure(exit));
  }),
);

// ---------------------------------------------------------------------------
// Message ids
// ---------------------------------------------------------------------------

it("splits a message id from the right, so a stream id may contain a colon", () => {
  deepStrictEqual(parseNewsMessageId("club:club:with:colons:12"), {
    streamType: "club",
    streamId: "club:with:colons",
    seq: 12,
  });
});

it("rejects ids that are not three parts with a numeric sequence", () => {
  strictEqual(parseNewsMessageId("season:save-1"), null);
  strictEqual(parseNewsMessageId("season:save-1:abc"), null);
  strictEqual(parseNewsMessageId(":save-1:1"), null);
  strictEqual(parseNewsMessageId("season::1"), null);
  strictEqual(parseNewsMessageId(""), null);
});
