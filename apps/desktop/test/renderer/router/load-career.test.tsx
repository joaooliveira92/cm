import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadCareerScreen } from "../../../src/renderer/router/loadCareer.js";
import { navigate } from "../../../src/renderer/navigation/adapter.js";
import { ALL_ACTIONS } from "../../../src/renderer/actions/allActions.js";
import { hasActionHandler, resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";

vi.mock("../../../src/renderer/navigation/adapter.js", () => ({
  navigate: vi.fn(),
}));

const mountedNavigate = vi.mocked(navigate);

const save = (name: string, archivedCause: string | null, overrides?: Record<string, unknown>) => ({
  id: `id-${name}`,
  name,
  createdAt: "2026-01-01T00:00:00.000Z",
  archivedCause,
  managerName: "Test Manager",
  userClubName: "Test Club",
  seasonNumber: 1,
  gameDate: "2026-08-15",
  lastModifiedAt: "2026-01-10T12:00:00.000Z",
  ...overrides,
});

let deleteCalledWith: string | null = null;

const mount = (savesConfig: ReadonlyArray<unknown>) => {
  deleteCalledWith = null;
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload?: { id: string }) => {
      if (method === "listSaves") {
        return { _tag: "Success", value: savesConfig };
      }
      if (method === "deleteSave") {
        deleteCalledWith = payload?.id ?? null;
        return { _tag: "Success", value: undefined };
      }
      if (method === "loadSave") {
        const found = (savesConfig as Array<{ id: string }>).find((s) => s.id === payload?.id);
        return found
          ? { _tag: "Success", value: found }
          : { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: payload?.id } };
      }
      return { _tag: "Success", value: "pong" };
    },
  };
  render(<LoadCareerScreen />);
};

const mountWithListSavesFailure = () => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) => {
      if (method === "listSaves") {
        return { _tag: "Failure", error: { _tag: "TransportFailure", method: "listSaves", cause: null } };
      }
      return { _tag: "Success", value: "pong" };
    },
  };
  render(<LoadCareerScreen />);
};

beforeEach(() => {
  mountedNavigate.mockClear();
  resetActionHandlers();
  cleanup();
});
afterEach(cleanup);

describe("Load Career — rich save cards with metadata", () => {
  it("shows manager name, club name, season info, created date and last played", async () => {
    mount([
      save("My Career", null, {
        managerName: "João Silva",
        userClubName: "Arsenal",
        seasonNumber: 2,
        gameDate: "2027-03-10",
        createdAt: "2026-06-01T10:00:00.000Z",
        lastModifiedAt: "2027-03-10T18:30:00.000Z",
      }),
    ]);

    expect(await screen.findByText("João Silva")).toBeTruthy();
    expect(screen.getByText("Arsenal")).toBeTruthy();
    expect(screen.getByText(/Season 2/)).toBeTruthy();
    expect(screen.getByText(/March 2027/)).toBeTruthy();
    expect(screen.getByText("1 Jun 2026")).toBeTruthy();
  });

  it("marks an archived save and leaves a live one unmarked", async () => {
    mount([save("Live Career", null), save("Retired Career", "retired")]);

    expect(await screen.findByText("Live Career")).toBeTruthy();
    expect(screen.getByText("Retired Career")).toBeTruthy();
    const badges = screen.getAllByText("Archived");
    expect(badges).toHaveLength(1);
  });

  it("marks a sacked save the same as a retired one", async () => {
    mount([save("Sacked Career", "sacked"), save("Retired Career", "retired")]);

    await screen.findByText("Sacked Career");
    expect(screen.getAllByText("Archived")).toHaveLength(2);
  });
});

describe("Load Career — failed listSaves", () => {
  it("shows an error message and retry button when listSaves fails", async () => {
    mountWithListSavesFailure();

    expect(await screen.findByText("Failed to load saves.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.queryByText("No saves yet.")).toBeNull();
  });

  it("recovers from a failed listSaves on retry", async () => {
    mountWithListSavesFailure();

    await screen.findByText("Failed to load saves.");

    (window as unknown as { cmClone: { call: unknown } }).cmClone = {
      call: async (method: string) =>
        method === "listSaves"
          ? { _tag: "Success", value: [save("Recovered Career", null)] }
          : { _tag: "Success", value: "pong" },
    };

    screen.getByRole("button", { name: "Retry" }).click();

    await screen.findByText("Recovered Career");
    expect(screen.queryByText("Failed to load saves.")).toBeNull();
  });

  it("registers the retry as a loadCareer-scoped Action and wires the button to it", async () => {
    mountWithListSavesFailure();

    const retry = await screen.findByRole("button", { name: "Retry" });
    expect(retry.getAttribute("data-action-id")).toBe("retry-save-list");

    const entries = ALL_ACTIONS.filter((action) => action.id === "retry-save-list");
    expect(entries.map((action) => action.scope).sort()).toEqual(["loadCareer", "mainMenu"]);
    expect(hasActionHandler("retry-save-list")).toBe(true);
  });
});

describe("Load Career — empty state and navigation", () => {
  it("shows an empty state with a direct Start New Career action when no saves exist", async () => {
    mount([]);

    await screen.findByText(/No saves yet/);
    expect(screen.getByRole("button", { name: "Start New Career" })).toBeTruthy();
  });

  it("Start New Career in the empty state navigates to league selection", async () => {
    mount([]);

    await screen.findByText(/No saves yet/);
    fireEvent.click(screen.getByRole("button", { name: "Start New Career" }));
    expect(mountedNavigate).toHaveBeenCalledWith({ type: "createLeagues" });
  });

  it("Back returns to the main menu", async () => {
    mount([]);

    await screen.findByText(/No saves yet/);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(mountedNavigate).toHaveBeenCalledWith({ type: "mainMenu" });
  });
});

describe("Load Career — a save that will not open", () => {
  it("says why when a save was made under another schema, instead of doing nothing", async () => {
    (window as unknown as { cmClone: { call: unknown } }).cmClone = {
      call: async (method: string, payload?: { id: string }) => {
        if (method === "listSaves") {
          return { _tag: "Success", value: [save("Old Career", null)] };
        }
        if (method === "loadSave" && payload?.id === "id-Old Career") {
          return { _tag: "Failure", error: { _tag: "SaveSchemaMismatchError", id: "id-Old Career" } };
        }
        return { _tag: "Success", value: "pong" };
      },
    };
    render(<LoadCareerScreen />);

    fireEvent.click(
      (await screen.findByText("Old Career")).closest("li")!.querySelector("button")!,
    );

    expect((await screen.findByRole("alert")).textContent).toBe(
      "This save was made by a different version of the game and can no longer be opened.",
    );
  });
});

describe("Load Career — delete save", () => {
  it("shows a delete button on each save card", async () => {
    mount([save("Delete Me", null)]);

    await screen.findByText("Delete Me");
    const card = screen.getByText("Delete Me").closest("li")!;
    expect(card.querySelector('[aria-label="Delete"]') ?? card.querySelector('button')).toBeTruthy();
  });

  it("opens a confirmation dialog when delete is clicked", async () => {
    mount([save("Confirm Delete", null)]);

    await screen.findByText("Confirm Delete");
    const deleteBtn = screen.getAllByRole("button").find((b) => b.textContent?.trim() === "Delete")!;
    fireEvent.click(deleteBtn);

    expect(screen.getByRole("dialog", { name: "Delete save" })).toBeTruthy();
  });

  it("cancels delete when Cancel is clicked in the dialog", async () => {
    mount([save("Cancel Delete", null)]);

    await screen.findByText("Cancel Delete");
    const deleteBtn = screen.getAllByRole("button").find((b) => b.textContent?.trim() === "Delete")!;
    fireEvent.click(deleteBtn);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Delete save" })).toBeNull();
  });

  it("calls deleteSave when confirmed", async () => {
    mount([save("Really Delete", null)]);

    await screen.findByText("Really Delete");

    deleteCalledWith = null;
    const deleteBtn = screen.getAllByRole("button").find((b) => b.textContent?.trim() === "Delete")!;
    fireEvent.click(deleteBtn);
    const confirmBtn = screen.getAllByRole("button").filter((b) => b.textContent?.trim() === "Delete")[1]!;
    fireEvent.click(confirmBtn);

    await vi.waitFor(() => expect(deleteCalledWith).toBe("id-Really Delete"));
  });
});