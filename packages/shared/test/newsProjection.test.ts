import { describe, expect, it } from "vitest";
import {
  countNews,
  filterNews,
  newsMessageId,
  projectNews,
  projectNewsMessage,
  type NewsFilter,
  type NewsMessage,
  type NewsSourceEvent,
} from "../src/newsProjection.js";

const CLUB = { clubId: "club-1", clubName: "Northgate United" };

const event = (
  overrides: Partial<NewsSourceEvent> & Pick<NewsSourceEvent, "tag" | "payload">,
): NewsSourceEvent => ({
  streamType: "season",
  streamId: "save-1",
  seq: 1,
  createdAt: "2026-01-01 10:00:00",
  ...overrides,
});

const UNTOUCHED = { read: false, archived: false, flagged: false } as const;

describe("newsMessageId", () => {
  it("addresses a message by its event coordinates, not a minted id", () => {
    expect(newsMessageId(event({ tag: "SeasonStarted", payload: {}, seq: 7 }))).toBe(
      "season:save-1:7",
    );
  });

  it("distinguishes the same seq on different streams", () => {
    const a = newsMessageId(event({ tag: "PlayerDeveloped", payload: {}, streamType: "club", streamId: "club-1" }));
    const b = newsMessageId(event({ tag: "SeasonStarted", payload: {} }));
    expect(a).not.toBe(b);
  });
});

describe("projectNewsMessage", () => {
  it("projects a season start", () => {
    const message = projectNewsMessage(
      event({ tag: "SeasonStarted", payload: { seasonNumber: 1, fixtureCount: 38 } }),
      UNTOUCHED,
      CLUB,
    );
    expect(message).not.toBeNull();
    expect(message?.category).toBe("season");
    expect(message?.priority).toBe("normal");
    expect(message?.state).toBe("unread");
    expect(message?.seasonNumber).toBe(1);
    expect(message?.subject).toContain("Season 1");
    expect(message?.body).toContain("38");
  });

  it("reports the manager's own result for a resolved date", () => {
    const message = projectNewsMessage(
      event({
        tag: "MatchdayResolved",
        payload: {
          date: "2026-09-12",
          results: [
            { fixtureId: "f1", homeClubId: "club-9", awayClubId: "club-8", homeGoals: 0, awayGoals: 0 },
            { fixtureId: "f2", homeClubId: "club-1", awayClubId: "club-2", homeGoals: 3, awayGoals: 1 },
          ],
        },
      }),
      UNTOUCHED,
      CLUB,
    );
    expect(message?.category).toBe("result");
    expect(message?.date).toBe("2026-09-12");
    expect(message?.subject).toContain("2026-09-12");
    expect(message?.body).toContain("3-1");
    expect(message?.body).toContain("Northgate United");
  });

  it("still projects a resolved date the manager's club did not play in", () => {
    const message = projectNewsMessage(
      event({
        tag: "MatchdayResolved",
        payload: {
          date: "2026-09-12",
          results: [
            { fixtureId: "f1", homeClubId: "club-9", awayClubId: "club-8", homeGoals: 0, awayGoals: 0 },
          ],
        },
      }),
      UNTOUCHED,
      CLUB,
    );
    expect(message).not.toBeNull();
    expect(message?.body).toContain("1");
  });

  it("raises priority on a board warning", () => {
    const warned = projectNewsMessage(
      event({ tag: "ManagerWarned", payload: { seasonNumber: 2, consecutiveMisses: 1 } }),
      UNTOUCHED,
      CLUB,
    );
    expect(warned?.category).toBe("board");
    expect(warned?.priority).toBe("high");
  });

  it("raises priority on a dismissal", () => {
    const sacked = projectNewsMessage(
      event({ tag: "ManagerSacked", payload: { seasonNumber: 3, consecutiveMisses: 2 } }),
      UNTOUCHED,
      CLUB,
    );
    expect(sacked?.priority).toBe("high");
  });

  it("keys a board verdict's priority off the verdict, not the tag", () => {
    const missed = projectNewsMessage(
      event({
        tag: "BoardObjectiveJudged",
        payload: { seasonNumber: 1, clubId: "club-1", finalPosition: 18, band: { minPosition: 1, maxPosition: 10 }, verdict: "missed" },
      }),
      UNTOUCHED,
      CLUB,
    );
    const met = projectNewsMessage(
      event({
        tag: "BoardObjectiveJudged",
        payload: { seasonNumber: 1, clubId: "club-1", finalPosition: 4, band: { minPosition: 1, maxPosition: 10 }, verdict: "met" },
      }),
      UNTOUCHED,
      CLUB,
    );
    expect(missed?.priority).toBe("high");
    expect(met?.priority).toBe("normal");
  });

  it("projects both transfer window boundaries", () => {
    const opened = projectNewsMessage(
      event({ tag: "TransferWindowOpened", payload: { window: "mid_season", date: "2027-01-01" } }),
      UNTOUCHED,
      CLUB,
    );
    const closed = projectNewsMessage(
      event({ tag: "TransferWindowClosed", payload: { window: "pre_season", date: "2026-08-01" } }),
      UNTOUCHED,
      CLUB,
    );
    expect(opened?.category).toBe("transfer");
    expect(closed?.category).toBe("transfer");
    expect(opened?.subject).not.toBe(closed?.subject);
  });

  it("summarises a development pass without naming every player", () => {
    const message = projectNewsMessage(
      event({
        tag: "PlayerDeveloped",
        streamType: "club",
        streamId: "club-1",
        payload: {
          seasonNumber: 1,
          clubId: "club-1",
          players: [{ playerId: "p1" }, { playerId: "p2" }, { playerId: "p3" }],
        },
      }),
      UNTOUCHED,
      CLUB,
    );
    expect(message?.category).toBe("development");
    expect(message?.body).toContain("3");
  });

  it("carries the stored user state onto the message", () => {
    const read = projectNewsMessage(
      event({ tag: "SeasonConcluded", payload: { seasonNumber: 1 } }),
      { read: true, archived: false, flagged: true },
      CLUB,
    );
    expect(read?.state).toBe("read");
    expect(read?.flagged).toBe(true);
  });

  it("reports archived state ahead of read state", () => {
    const archived = projectNewsMessage(
      event({ tag: "SeasonConcluded", payload: { seasonNumber: 1 } }),
      { read: false, archived: true, flagged: false },
      CLUB,
    );
    expect(archived?.state).toBe("archived");
  });

  it("drops an event with no news meaning rather than inventing copy for it", () => {
    expect(
      projectNewsMessage(event({ tag: "MatchStarted", payload: { seed: 1 } }), UNTOUCHED, CLUB),
    ).toBeNull();
  });

  it("drops an event whose payload does not match its tag", () => {
    expect(
      projectNewsMessage(event({ tag: "MatchdayResolved", payload: "not-an-object" }), UNTOUCHED, CLUB),
    ).toBeNull();
    expect(
      projectNewsMessage(event({ tag: "SeasonStarted", payload: { seasonNumber: "one" } }), UNTOUCHED, CLUB),
    ).toBeNull();
  });
});

describe("projectNews", () => {
  const events: ReadonlyArray<NewsSourceEvent> = [
    event({ tag: "SeasonStarted", payload: { seasonNumber: 1, fixtureCount: 38 }, seq: 1 }),
    event({ tag: "MatchStarted", payload: {}, seq: 2 }),
    event({ tag: "MatchdayResolved", payload: { date: "2026-08-01", results: [] }, seq: 3 }),
  ];

  it("skips unprojectable events without shifting the others", () => {
    const messages = projectNews(events, new Map(), CLUB);
    expect(messages).toHaveLength(2);
    expect(messages.map((m) => m.seq)).toEqual([3, 1]);
  });

  it("orders newest first", () => {
    const messages = projectNews(events, new Map(), CLUB);
    expect(messages[0]?.category).toBe("result");
  });

  it("applies stored state by message id", () => {
    const state = new Map([["season:save-1:1", { read: true, archived: false, flagged: false }]]);
    const messages = projectNews(events, state, CLUB);
    expect(messages.find((m) => m.seq === 1)?.state).toBe("read");
    expect(messages.find((m) => m.seq === 3)?.state).toBe("unread");
  });
});

describe("filterNews", () => {
  const message = (overrides: Partial<NewsMessage>): NewsMessage => ({
    messageId: "season:save-1:1",
    category: "season",
    priority: "normal",
    state: "unread",
    actionState: "none",
    flagged: false,
    subject: "Season 1 begins",
    body: "38 fixtures scheduled.",
    seasonNumber: 1,
    date: null,
    occurredAt: "2026-01-01 10:00:00",
    seq: 1,
    ordinal: 1,
    ...overrides,
  });

  const filter = (overrides: Partial<NewsFilter> = {}): NewsFilter => ({
    view: "all",
    categories: [],
    search: "",
    ...overrides,
  });

  const messages = [
    message({ messageId: "a", state: "unread", category: "season" }),
    message({ messageId: "b", state: "read", category: "board", subject: "Board verdict" }),
    message({ messageId: "c", state: "archived", category: "result", subject: "Matchday 1" }),
    message({ messageId: "d", state: "read", category: "board", flagged: true, subject: "Warning" }),
  ];

  it("hides archived messages from the default view", () => {
    expect(filterNews(messages, filter()).map((m) => m.messageId)).toEqual(["a", "b", "d"]);
  });

  it("shows only archived messages in the archived view", () => {
    expect(filterNews(messages, filter({ view: "archived" })).map((m) => m.messageId)).toEqual(["c"]);
  });

  it("shows only unread messages in the unread view, archived excluded", () => {
    expect(filterNews(messages, filter({ view: "unread" })).map((m) => m.messageId)).toEqual(["a"]);
  });

  it("shows only flagged messages in the flagged view", () => {
    expect(filterNews(messages, filter({ view: "flagged" })).map((m) => m.messageId)).toEqual(["d"]);
  });

  it("narrows by category", () => {
    expect(
      filterNews(messages, filter({ categories: ["board"] })).map((m) => m.messageId),
    ).toEqual(["b", "d"]);
  });

  it("treats an empty category list as no category constraint", () => {
    expect(filterNews(messages, filter({ categories: [] }))).toHaveLength(3);
  });

  it("searches subject and body case-insensitively", () => {
    expect(filterNews(messages, filter({ search: "board VERDICT" })).map((m) => m.messageId)).toEqual([
      "b",
    ]);
  });

  it("ignores surrounding whitespace in a search term", () => {
    expect(filterNews(messages, filter({ search: "  warning  " })).map((m) => m.messageId)).toEqual([
      "d",
    ]);
  });

  it("combines view, category, and search conjunctively", () => {
    expect(
      filterNews(messages, filter({ view: "flagged", categories: ["board"], search: "warn" })),
    ).toHaveLength(1);
    expect(
      filterNews(messages, filter({ view: "flagged", categories: ["season"], search: "warn" })),
    ).toHaveLength(0);
  });
});

describe("countNews", () => {
  const message = (overrides: Partial<NewsMessage>): NewsMessage => ({
    messageId: "m",
    category: "season",
    priority: "normal",
    state: "unread",
    actionState: "none",
    flagged: false,
    subject: "s",
    body: "b",
    seasonNumber: 1,
    date: null,
    occurredAt: "2026-01-01 10:00:00",
    seq: 1,
    ordinal: 1,
    ...overrides,
  });

  it("counts unread, flagged, and archived separately", () => {
    const counts = countNews([
      message({ messageId: "a", state: "unread" }),
      message({ messageId: "b", state: "read", flagged: true }),
      message({ messageId: "c", state: "archived" }),
      message({ messageId: "d", state: "unread", priority: "high" }),
    ]);
    expect(counts).toEqual({
      total: 3,
      unread: 2,
      actionRequired: 0,
      flagged: 1,
      archived: 1,
      highPriorityUnread: 1,
    });
  });

  it("excludes archived messages from the unread count", () => {
    const counts = countNews([message({ messageId: "a", state: "archived" })]);
    expect(counts.unread).toBe(0);
    expect(counts.total).toBe(0);
  });

  it("counts nothing for an empty inbox", () => {
    expect(countNews([])).toEqual({
      total: 0,
      unread: 0,
      actionRequired: 0,
      flagged: 0,
      archived: 0,
      highPriorityUnread: 0,
    });
  });
});

describe("BidReceived — the one message that waits on the manager", () => {
  const bidEvent = event({
    tag: "BidReceived",
    streamType: "club",
    streamId: "club-1",
    payload: {
      bidId: "bid-1",
      playerId: "p-1",
      playerName: "Ada Baker",
      biddingClubId: "club-2",
      amount: 2_500_000,
      seasonNumber: 1,
    },
  });

  it("is action-required while the bid is still pending", () => {
    const message = projectNewsMessage(bidEvent, UNTOUCHED, CLUB, new Map([["bid-1", "pending"]]));
    expect(message?.actionState).toBe("required");
    expect(message?.category).toBe("transfer");
    expect(message?.priority).toBe("high");
    expect(message?.subject).toContain("Ada Baker");
    expect(message?.body).toContain("£2.5m");
  });

  it("warns that advancing lets the bid lapse", () => {
    const message = projectNewsMessage(bidEvent, UNTOUCHED, CLUB, new Map([["bid-1", "pending"]]));
    expect(message?.body).toContain("lapse");
  });

  it("reads as settled once the bid is answered", () => {
    for (const status of ["accepted", "rejected", "countered", "withdrawn"]) {
      const message = projectNewsMessage(bidEvent, UNTOUCHED, CLUB, new Map([["bid-1", status]]));
      expect(message?.actionState).toBe("completed");
      expect(message?.priority).toBe("normal");
    }
  });

  it("reads as lapsed once the bid expires, and says the player stayed", () => {
    const message = projectNewsMessage(bidEvent, UNTOUCHED, CLUB, new Map([["bid-1", "expired"]]));
    expect(message?.actionState).toBe("expired");
    expect(message?.body).toContain("lapsed");
    expect(message?.body).toContain("Northgate United");
  });

  it("does not claim a decision is open when the bid row is gone", () => {
    expect(projectNewsMessage(bidEvent, UNTOUCHED, CLUB, new Map())?.actionState).toBe("completed");
  });

  it("drops the message when the payload names no bid", () => {
    expect(
      projectNewsMessage(
        event({ tag: "BidReceived", payload: { amount: 1 } }),
        UNTOUCHED,
        CLUB,
        new Map(),
      ),
    ).toBeNull();
  });

  it("leaves every other message with no action state", () => {
    const message = projectNewsMessage(
      event({ tag: "SeasonConcluded", payload: { seasonNumber: 1 } }),
      UNTOUCHED,
      CLUB,
    );
    expect(message?.actionState).toBe("none");
  });
});

describe("the action view", () => {
  const actionable = (overrides: Partial<NewsMessage>): NewsMessage => ({
    messageId: "m",
    category: "transfer",
    priority: "high",
    state: "unread",
    actionState: "required",
    flagged: false,
    subject: "Transfer offer",
    body: "b",
    seasonNumber: 1,
    date: null,
    occurredAt: "2026-01-01 10:00:00",
    seq: 1,
    ordinal: 1,
    ...overrides,
  });

  const messages = [
    actionable({ messageId: "open" }),
    actionable({ messageId: "settled", actionState: "completed" }),
    actionable({ messageId: "filed", state: "archived" }),
    actionable({ messageId: "plain", actionState: "none", category: "season" }),
  ];

  it("shows only decisions that are still open", () => {
    expect(
      filterNews(messages, { view: "action", categories: [], search: "" }).map((m) => m.messageId),
    ).toEqual(["open", "filed"]);
  });

  it("counts open decisions even when they have been archived", () => {
    expect(countNews(messages).actionRequired).toBe(2);
  });
});

describe("cross-stream ordering", () => {
  /** `seq` counts within one stream, so the Season stream's seq 1 and the club stream's seq 1 are
   *  not comparable. Two events written by the same advance share a `created_at` to the second, so
   *  without a global ordinal the inbox's order across streams is arbitrary. */
  it("breaks a same-timestamp tie on the log's append order, not on seq", () => {
    const messages = projectNews(
      [
        {
          streamType: "season",
          streamId: "save-1",
          seq: 9,
          ordinal: 1,
          tag: "SeasonStarted",
          payload: { seasonNumber: 1, fixtureCount: 38 },
          createdAt: "2026-01-01 10:00:00",
        },
        {
          streamType: "club",
          streamId: "club-1",
          seq: 1,
          ordinal: 2,
          tag: "BidReceived",
          payload: { bidId: "b1", playerName: "Ada", amount: 1_000_000, seasonNumber: 1 },
          createdAt: "2026-01-01 10:00:00",
        },
      ],
      new Map(),
      CLUB,
      new Map([["b1", "pending"]]),
    );

    expect(messages.map((m) => m.category)).toEqual(["transfer", "season"]);
  });

  it("falls back to seq when no ordinal is supplied", () => {
    const messages = projectNews(
      [
        event({ tag: "SeasonConcluded", payload: { seasonNumber: 1 }, seq: 1 }),
        event({ tag: "SeasonStarted", payload: { seasonNumber: 2, fixtureCount: 38 }, seq: 2 }),
      ],
      new Map(),
      CLUB,
    );

    expect(messages.map((m) => m.seq)).toEqual([2, 1]);
  });
});
