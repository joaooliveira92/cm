/**
 * Copy for the Youth Intake message (gate-red-on-dev ticket 07). Beside `newsProjection.test.ts`
 * rather than in it, which is at the file-length ceiling.
 */
import { describe, expect, it } from "vitest";
import { projectNewsMessage, type NewsSourceEvent } from "../../src/news/newsProjection.js";

const CLUB = { clubId: "club-1", clubName: "Northgate United", presidentName: "Alan Reyes" };
const UNTOUCHED = { read: false, archived: false, flagged: false } as const;

const event = (
  overrides: Partial<NewsSourceEvent> & Pick<NewsSourceEvent, "tag" | "payload">,
): NewsSourceEvent => ({
  streamType: "season",
  streamId: "save-1",
  seq: 1,
  createdAt: "2026-01-01 10:00:00",
  ...overrides,
});

describe("Youth Intake copy", () => {
  it("names every player of a Youth Intake in one message", () => {
    const message = projectNewsMessage(
      event({
        tag: "YouthIntakeJoined",
        streamType: "club",
        streamId: "club-1",
        payload: {
          seasonNumber: 2,
          players: [
            { playerId: "p1", name: "Ada Lovelace" },
            { playerId: "p2", name: "Alan Turing" },
            { playerId: "p3", name: "Grace Hopper" },
          ],
        },
      }),
      UNTOUCHED,
      CLUB,
    );
    expect(message?.category).toBe("season");
    expect(message?.seasonNumber).toBe(2);
    expect(message?.subject).toBe("Youth intake for season 2");
    expect(message?.body).toContain("3 young players join");
    expect(message?.body).toContain("Ada Lovelace, Alan Turing and Grace Hopper");
  });

  it("drops a Youth Intake payload that names nobody", () => {
    const message = projectNewsMessage(
      event({ tag: "YouthIntakeJoined", payload: { seasonNumber: 2, players: [] } }),
      UNTOUCHED,
      CLUB,
    );
    expect(message).toBeNull();
  });
});
