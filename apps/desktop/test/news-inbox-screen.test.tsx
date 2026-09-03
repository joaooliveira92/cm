// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { NewsInboxScreen } from "../src/renderer/news/NewsInboxScreen.js";
import { RegistryProvider } from "../src/renderer/rpc.js";

const saveId = SaveId.make("s1");

interface MessageOverrides {
  readonly messageId?: string;
  readonly category?: string;
  readonly priority?: string;
  readonly state?: string;
  readonly actionState?: string;
  readonly flagged?: boolean;
  readonly subject?: string;
  readonly body?: string;
  readonly seasonNumber?: number | null;
  readonly date?: string | null;
}

const message = (overrides: MessageOverrides) => ({
  messageId: "season:s1:1",
  category: "season",
  priority: "normal",
  state: "unread",
  actionState: "none",
  flagged: false,
  subject: "Season 1 begins",
  body: "38 fixtures are scheduled.",
  seasonNumber: 1,
  date: null,
  occurredAt: "2026-01-01 10:00:00",
  ...overrides,
});

const MESSAGES = [
  message({ messageId: "m-board", category: "board", priority: "high", subject: "The board has issued a warning", body: "Another miss puts the job at risk." }),
  message({ messageId: "m-result", category: "result", state: "read", subject: "Results for 2026-09-12", body: "Test FC won 3-1 at home.", seasonNumber: null, date: "2026-09-12" }),
  message({ messageId: "m-season", category: "season", state: "read", flagged: true, subject: "Season 1 begins" }),
  message({ messageId: "m-old", category: "transfer", state: "archived", subject: "The pre-season transfer window has closed" }),
];

const counts = {
  total: 3,
  unread: 1,
  actionRequired: 0,
  flagged: 1,
  archived: 1,
  highPriorityUnread: 1,
};

/** Preload double that answers the inbox query and records every state patch, so a test can tell
 * "the button rendered" from "the command was actually sent". */
const mockPreload = (patches: Array<unknown>, messages: ReadonlyArray<unknown> = MESSAGES) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: unknown) => {
      if (method === "getNewsInbox") return { _tag: "Success", value: { messages, counts } };
      if (method === "setNewsMessageState") {
        patches.push(payload);
        return { _tag: "Success", value: undefined };
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: saveId } };
    },
  };
};

const mount = () =>
  render(
    <RegistryProvider>
      <NewsInboxScreen saveId={saveId} />
    </RegistryProvider>,
  );

const rows = () => within(screen.getByRole("listbox", { name: "Messages" })).getAllByRole("option");

let patches: Array<unknown>;

beforeEach(() => {
  cleanup();
  patches = [];
  mockPreload(patches);
});

describe("News Inbox (Screen 24)", () => {
  it("lists the live inbox and hides archived messages", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));
    expect(screen.queryByText("The pre-season transfer window has closed")).toBeNull();
  });

  it("reports whole-inbox counts, not the filtered result", async () => {
    mount();
    await waitFor(() => expect(screen.getByText(/1 unread of 3/)).toBeTruthy());

    fireEvent.click(screen.getByRole("tab", { name: "Unread" }));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.getByText(/1 unread of 3/)).toBeTruthy();
  });

  it("states unread and priority in text, never by colour alone", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));
    const board = rows().find((row) => row.textContent?.includes("board has issued"))!;
    expect(board.textContent).toContain("Unread");
    expect(board.textContent).toContain("Priority");
  });
});

describe("News Filters (Screen 26)", () => {
  it("narrows by category", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));

    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]!.textContent).toContain("board has issued");
  });

  it("searches subject and body", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));

    fireEvent.change(screen.getByLabelText("Search news"), { target: { value: "won 3-1" } });
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]!.textContent).toContain("Results for 2026-09-12");
  });

  it("shows archived messages only in the archived view", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));

    fireEvent.click(screen.getByRole("tab", { name: "Archived" }));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]!.textContent).toContain("transfer window has closed");
  });

  it("distinguishes an empty result from an empty inbox", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));

    fireEvent.change(screen.getByLabelText("Search news"), { target: { value: "zzzz" } });
    await waitFor(() => expect(screen.getByText("No messages match these filters.")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(rows()).toHaveLength(3));
  });

  it("says nothing has happened yet when the inbox is genuinely empty", async () => {
    mockPreload(patches, []);
    mount();
    await waitFor(() =>
      expect(screen.getByText(/No news yet\./)).toBeTruthy(),
    );
  });
});

describe("Individual News Message (Screen 25)", () => {
  it("opens the first message by default", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain(
      "The board has issued a warning",
    );
  });

  it("marks a message read when it is opened", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));

    fireEvent.click(rows().find((row) => row.textContent?.includes("board has issued"))!);
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]).toMatchObject({
      saveId,
      messageIds: ["m-board"],
      patch: { read: true },
    });
  });

  it("does not re-mark a message that is already read", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));

    fireEvent.click(rows().find((row) => row.textContent?.includes("Results for 2026-09-12"))!);
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("Results for 2026-09-12"),
    );
    expect(patches).toHaveLength(0);
  });

  it("flags and archives the open message", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));

    fireEvent.click(screen.getByRole("button", { name: "Flag" }));
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]).toMatchObject({ messageIds: ["m-board"], patch: { flagged: true } });

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(patches).toHaveLength(2));
    expect(patches[1]).toMatchObject({ messageIds: ["m-board"], patch: { archived: true } });
  });

  it("offers Restore rather than Archive for an archived message", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));
    fireEvent.click(screen.getByRole("tab", { name: "Archived" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Restore" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]).toMatchObject({ messageIds: ["m-old"], patch: { archived: false } });
  });
});

describe("keyboard and bulk actions", () => {
  it("moves the selection with the arrow keys", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));

    const list = screen.getByRole("listbox", { name: "Messages" });
    expect(list.getAttribute("aria-activedescendant")).toBe("news-row-m-board");

    fireEvent.keyDown(list, { key: "ArrowDown" });
    await waitFor(() =>
      expect(list.getAttribute("aria-activedescendant")).toBe("news-row-m-result"),
    );

    fireEvent.keyDown(list, { key: "End" });
    await waitFor(() =>
      expect(list.getAttribute("aria-activedescendant")).toBe("news-row-m-season"),
    );

    fireEvent.keyDown(list, { key: "Home" });
    await waitFor(() =>
      expect(list.getAttribute("aria-activedescendant")).toBe("news-row-m-board"),
    );
  });

  it("marks every eligible visible message read in one command", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));

    fireEvent.click(screen.getByRole("button", { name: "Mark all read (1)" }));
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]).toMatchObject({ messageIds: ["m-board"], patch: { read: true } });
  });

  it("archives only what is not already archived", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));

    fireEvent.click(screen.getByRole("button", { name: "Archive all (3)" }));
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]).toMatchObject({
      messageIds: ["m-board", "m-result", "m-season"],
      patch: { archived: true },
    });
  });

  it("keeps the selection when a filter still contains it", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));

    const list = screen.getByRole("listbox", { name: "Messages" });
    fireEvent.keyDown(list, { key: "ArrowDown" });
    await waitFor(() =>
      expect(list.getAttribute("aria-activedescendant")).toBe("news-row-m-result"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Results" }));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(list.getAttribute("aria-activedescendant")).toBe("news-row-m-result");
  });

  it("falls back to the first row when a filter hides the selection", async () => {
    mount();
    await waitFor(() => expect(rows()).toHaveLength(3));

    const list = screen.getByRole("listbox", { name: "Messages" });
    expect(list.getAttribute("aria-activedescendant")).toBe("news-row-m-board");

    fireEvent.click(screen.getByRole("button", { name: "Results" }));
    await waitFor(() =>
      expect(list.getAttribute("aria-activedescendant")).toBe("news-row-m-result"),
    );
  });
});

describe("action-required messages", () => {
  const ACTIONABLE = [
    message({
      messageId: "m-bid",
      category: "transfer",
      priority: "high",
      actionState: "required",
      subject: "Transfer offer for Ada Baker",
      body: "A club has offered £2.5m for Ada Baker.",
    }),
    message({
      messageId: "m-lapsed",
      category: "transfer",
      state: "read",
      actionState: "expired",
      subject: "Transfer offer for Bo Reid (lapsed)",
      body: "The offer lapsed without an answer.",
    }),
    message({ messageId: "m-plain", category: "season", state: "read" }),
  ];

  const mountActionable = () => {
    (window as unknown as { cmClone: { call: unknown } }).cmClone = {
      call: async (method: string, payload: unknown) => {
        if (method === "getNewsInbox")
          return {
            _tag: "Success",
            value: {
              messages: ACTIONABLE,
              counts: { ...counts, total: 3, unread: 1, actionRequired: 1, archived: 0 },
            },
          };
        if (method === "setNewsMessageState") {
          patches.push(payload);
          return { _tag: "Success", value: undefined };
        }
        return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: saveId } };
      },
    };
    return mount();
  };

  it("says an open decision is waiting, in words", async () => {
    mountActionable();
    await waitFor(() => expect(rows()).toHaveLength(3));

    const row = rows().find((r) => r.textContent?.includes("Ada Baker"))!;
    expect(row.textContent).toContain("Action required");
  });

  it("counts open decisions in the header", async () => {
    mountActionable();
    await waitFor(() => expect(screen.getByText(/1 awaiting your answer/)).toBeTruthy());
  });

  it("filters to just the open decisions", async () => {
    mountActionable();
    await waitFor(() => expect(rows()).toHaveLength(3));

    fireEvent.click(screen.getByRole("tab", { name: "Action required" }));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]!.textContent).toContain("Ada Baker");
  });

  it("routes to the screen that owns the decision rather than answering it here", async () => {
    mountActionable();
    await waitFor(() => expect(rows()).toHaveLength(3));

    expect(screen.getByRole("button", { name: "Answer on Transfers" })).toBeTruthy();
  });

  it("offers no answer route once a decision has lapsed", async () => {
    mountActionable();
    await waitFor(() => expect(rows()).toHaveLength(3));

    fireEvent.click(rows().find((r) => r.textContent?.includes("Bo Reid"))!);
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("Bo Reid"),
    );
    expect(screen.queryByRole("button", { name: "Answer on Transfers" })).toBeNull();
  });

  it("marks a lapsed decision as lapsed in the list", async () => {
    mountActionable();
    await waitFor(() => expect(rows()).toHaveLength(3));

    expect(rows().find((r) => r.textContent?.includes("Bo Reid"))!.textContent).toContain("Lapsed");
  });
});
