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
import { createSave } from "../../../src/main/world/index.js";
import { advanceThroughBoundary } from "../boundary-helpers.js";
import { getClubStaff, getNewsInbox, parseNewsMessageId, setNewsMessageState } from "../../../src/main/career/index.js";
import { getSquad } from "../../../src/main/club/index.js";
import { advanceCalendar } from "../../../src/main/season/index.js";
import { loadStreamEvents } from "../../../src/main/season/decider.js";

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

    yield* advanceThroughBoundary(savesDir, save.id);
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
    yield* advanceThroughBoundary(savesDir, save.id);
    yield* advanceThroughBoundary(savesDir, save.id);
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
    yield* advanceThroughBoundary(savesDir, save.id);
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

// ---------------------------------------------------------------------------
// The President's voice in board copy
//
// The warning and the dismissal speak as the President, whose name the main-process news query
// derives and hands the projection through `NewsClubContext` — same seam as the Club Staff read,
// so a warning and a dismissal a season apart must name the same person.
// ---------------------------------------------------------------------------

/** Leaves the season's last fixture between two other clubs unplayed, and parks the calendar the
 * day before it — the board-objectives test pattern, verbatim, so the drive below concludes each
 * Season the way that suite does. Assumes a `SqlClient` in context. */
const reopenFinalFixture = (clubId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`DELETE FROM fixtures WHERE competition_id IN (SELECT id FROM competitions WHERE kind = 'cup')`;
    yield* sql`DELETE FROM competition_participants WHERE competition_id IN (SELECT id FROM competitions WHERE kind = 'cup')`;
    yield* sql`DELETE FROM competition_entrants`;
    yield* sql`UPDATE fixtures SET played = 0, home_goals = NULL, away_goals = NULL
      WHERE id = (SELECT id FROM fixtures
                  WHERE home_club_id <> ${clubId} AND away_club_id <> ${clubId}
                  ORDER BY scheduled_date DESC, id DESC LIMIT 1)`;
    yield* sql`UPDATE season SET phase = 'in_season',
      awaiting_fixture_id = NULL, awaiting_match_id = NULL,
      game_date = (SELECT date(MIN(scheduled_date), '-1 day') FROM fixtures WHERE played = 0)`;
  });

/** Test-only DB manipulation: forces every fixture in the current Season to a lopsided result for
 * `clubId`, guaranteeing it finishes 1st or last — a controlled substitute for running 380 real
 * match simulations, the board-objectives suite's established driver. */
const forceLopsidedFixtures = (saveId: string, clubId: string, outcome: "winEverything" | "loseEverything") =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const [clubGoals, otherGoals] = outcome === "winEverything" ? [5, 0] : [0, 5];
      yield* sql`UPDATE fixtures SET played = 1,
          home_goals = CASE WHEN home_club_id = ${clubId} THEN ${clubGoals} WHEN away_club_id = ${clubId} THEN ${otherGoals} ELSE 1 END,
          away_goals = CASE WHEN away_club_id = ${clubId} THEN ${clubGoals} WHEN home_club_id = ${clubId} THEN ${otherGoals} ELSE 1 END`;
      yield* reopenFinalFixture(clubId);
    }),
  );

/** Forces the Season the save is currently in to a lopsided finish — the driver for every Season
 * after the first, whose rollover has already opened a new `season` row. */
const forceCurrentSeasonConcludingWith = (saveId: string, clubId: string, outcome: "winEverything" | "loseEverything") =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const current = yield* sql<{ seasonNumber: number }>`
        SELECT MAX(season_number) as "seasonNumber" FROM season`;
      const seasonNumber = current[0]!.seasonNumber;
      yield* sql`UPDATE season SET phase = 'in_season' WHERE season_number = ${seasonNumber}`;

      const [clubGoals, otherGoals] = outcome === "winEverything" ? [5, 0] : [0, 5];
      yield* sql`UPDATE fixtures SET played = 1,
          home_goals = CASE WHEN home_club_id = ${clubId} THEN ${clubGoals} WHEN away_club_id = ${clubId} THEN ${otherGoals} ELSE 1 END,
          away_goals = CASE WHEN away_club_id = ${clubId} THEN ${clubGoals} WHEN home_club_id = ${clubId} THEN ${otherGoals} ELSE 1 END
        WHERE season_number = ${seasonNumber}`;
      yield* reopenFinalFixture(clubId);
    }),
  );

const loadSeasonStreamEvents = (saveId: string) =>
  loadStreamEvents("season", saveId).pipe(
    Effect.provide(
      SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true }),
    ),
    Effect.scoped,
  );

it.effect("the warning and the dismissal speak as the President — derived, never stored on the event", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    const clubId = squad.club.id;

    // Season 1 misses → warning (counter 0→1); Season 2 meets → counter resets; Season 3 misses
    // → second warning; Season 4 misses → sacked (1→2). Two warnings a season apart plus the
    // dismissal, one save — the shape the "same President across a projection run years apart"
    // criterion reads.
    yield* advanceCalendar(savesDir, save.id); // past pre-season
    yield* forceLopsidedFixtures(save.id, clubId, "loseEverything");
    strictEqual((yield* advanceCalendar(savesDir, save.id)).managerOutcome, "warned");

    yield* forceCurrentSeasonConcludingWith(save.id, clubId, "winEverything");
    strictEqual((yield* advanceCalendar(savesDir, save.id)).managerOutcome, "none");

    yield* forceCurrentSeasonConcludingWith(save.id, clubId, "loseEverything");
    strictEqual((yield* advanceCalendar(savesDir, save.id)).managerOutcome, "warned");
    yield* forceCurrentSeasonConcludingWith(save.id, clubId, "loseEverything");
    const sacked = yield* advanceCalendar(savesDir, save.id);
    strictEqual(sacked.managerOutcome, "sacked");

    const inbox = yield* getNewsInbox(savesDir, save.id);
    const warnings = inbox.messages.filter((message) =>
      message.subject.includes("has issued a warning"),
    );
    const dismissal = inbox.messages.find((message) =>
      message.subject.includes("has terminated your contract"),
    );

    // Two warnings a season apart, against the same save, name the same President.
    strictEqual(warnings.length, 2);
    ok(warnings.every((message) => message.subject === warnings[0]!.subject));
    const presidentName = warnings[0]!.subject.slice(0, -" has issued a warning".length);
    ok(
      presidentName.length > 0 && warnings[0]!.subject === `${presidentName} has issued a warning`,
      "the warning's subject is the President's derived name plus the warning act",
    );
    ok(warnings[0]!.body.includes(`${presidentName} has recorded`));

    // The dismissal speaks with the same voice: body names the President and keeps the recorded
    // miss count, subject keeps the club name and never names the person.
    ok(dismissal, "a second consecutive miss produces the dismissal message");
    ok(dismissal!.body.startsWith(`${presidentName} has dismissed you`));
    ok(dismissal!.body.includes("2 consecutive missed objectives"));
    strictEqual(dismissal!.subject, `${squad.club.name} has terminated your contract`);
    ok(!dismissal!.subject.includes(presidentName));

    // ... and it is the same President the Club Staff read derives: the news query and the staff
    // page are two readers of one derivation, so they cannot name two different people.
    const staff = yield* getClubStaff(savesDir, save.id, clubId);
    const executive = staff.groups.find((group) => group.department === "executive")!;
    const president = executive.members.find((member) => member.role === "president")!;
    strictEqual(`${president.firstName} ${president.lastName}`, presidentName);

    // The events themselves carry no name: the voice is derived on read, never ridden on the
    // event, so an old save re-voices on the next read and never the person.
    const events = yield* loadSeasonStreamEvents(save.id);
    const warnedEvent = events.find((event) => event.tag === "ManagerWarned");
    const sackedEvent = events.find((event) => event.tag === "ManagerSacked");
    ok(warnedEvent, "the drive must have written a ManagerWarned event");
    ok(sackedEvent, "the drive must have written a ManagerSacked event");
    deepStrictEqual(
      Object.keys(warnedEvent!.payload as Record<string, unknown>).sort(),
      ["consecutiveMisses", "seasonNumber"],
    );
    deepStrictEqual(
      Object.keys(sackedEvent!.payload as Record<string, unknown>).sort(),
      ["consecutiveMisses", "seasonNumber"],
    );
  }),
  30_000,
);
