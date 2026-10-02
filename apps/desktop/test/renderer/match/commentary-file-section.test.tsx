import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CommentaryFileSection } from "../../../src/renderer/match/CommentaryFileSection.js";

/** cm-style-commentary 04: Preferences shows the commentary file, opens it, resets it, and lists
 *  what the game skipped in it. */
const FILE = "/Users/p/Library/Application Support/cm/commentary/events.cfg";

/** The `addNewSections` flag of every `updateCommentaryFile` call the last `mockMain` saw. */
let updates: Array<boolean> = [];

const mockMain = (
  problems: ReadonlyArray<string>,
  files: ReadonlyArray<string> = ["events.cfg"],
  initialNewSections: ReadonlyArray<string> = [],
) => {
  const calls: Array<string> = [];
  updates = [];
  let active = "events.cfg";
  let newSections = initialNewSections;
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: { name?: string; addNewSections?: boolean } | undefined) => {
      if (method === "updateCommentaryFile") updates.push(payload?.addNewSections === true);
      calls.push(method);
      if (method === "chooseCommentaryFile" && payload?.name !== undefined) active = payload.name;
      if (method === "resetCommentaryFile") active = "events.cfg";
      if (method === "updateCommentaryFile") newSections = [];
      return {
        _tag: "Success",
        value: { file: FILE, files, active, newSections, problems: method === "resetCommentaryFile" ? [] : problems },
      };
    },
  };
  return calls;
};

afterEach(cleanup);

describe("the Commentary section of Preferences", () => {
  it("shows where the file is, and opens it", async () => {
    const calls = mockMain([]);
    render(<CommentaryFileSection />);
    expect(await screen.findByText(FILE)).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Problems in the commentary file" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open commentary file" }));
    await waitFor(() => expect(calls).toEqual(["getCommentaryFileStatus", "openCommentaryFile"]));
  });

  it("lists the problems the game found, with their line numbers", async () => {
    mockMain(["line 12: skipped, {player2} isn't available in [Foul]", "line 30: flash must be yes or no"]);
    render(<CommentaryFileSection />);
    const problems = await screen.findByRole("region", { name: "Problems in the commentary file" });
    expect(within(problems).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "line 12: skipped, {player2} isn't available in [Foul]",
      "line 30: flash must be yes or no",
    ]);
  });

  it("asks before resetting, since a reset loses the player's edits", async () => {
    const calls = mockMain(["line 2: flash must be yes or no"]);
    render(<CommentaryFileSection />);
    await screen.findByText(FILE);

    fireEvent.click(screen.getByRole("button", { name: "Reset to the game's lines" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep my edits" }));
    expect(calls).toEqual(["getCommentaryFileStatus"]);

    fireEvent.click(screen.getByRole("button", { name: "Reset to the game's lines" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset, losing my edits" }));
    await waitFor(() => expect(calls).toEqual(["getCommentaryFileStatus", "resetCommentaryFile"]));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Problems in the commentary file" })).toBeNull());
  });

  it("offers a choice of file only when the folder has more than one, and switches to the chosen one", async () => {
    mockMain([]);
    const { unmount } = render(<CommentaryFileSection />);
    await screen.findByText(FILE);
    expect(screen.queryByRole("combobox", { name: "File" })).toBeNull();
    unmount();

    const calls = mockMain([], ["events.cfg", "events_fr.cfg"]);
    render(<CommentaryFileSection />);
    const picker = (await screen.findByRole("combobox", { name: "File" })) as HTMLSelectElement;
    expect(picker.value).toBe("events.cfg");
    fireEvent.change(picker, { target: { value: "events_fr.cfg" } });
    await waitFor(() => expect((screen.getByRole("combobox", { name: "File" }) as HTMLSelectElement).value).toBe("events_fr.cfg"));
    expect(calls).toEqual(["getCommentaryFileStatus", "chooseCommentaryFile"]);
  });

  it("offers the game's new sections to an older file, either way only once", async () => {
    mockMain([], ["events.cfg"], ["Offside", "KeyPass:solo"]);
    render(<CommentaryFileSection />);
    const offer = await screen.findByRole("region", { name: "New commentary from the game" });
    expect(offer.textContent).toContain("2 sections");
    fireEvent.click(within(offer).getByRole("button", { name: "Add them to my file" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "New commentary from the game" })).toBeNull());
    expect(updates).toEqual([true]);
  });

  it("keeps an older file as it is when the player says so", async () => {
    mockMain([], ["events.cfg"], ["Offside"]);
    render(<CommentaryFileSection />);
    const offer = await screen.findByRole("region", { name: "New commentary from the game" });
    fireEvent.click(within(offer).getByRole("button", { name: "Keep my file as it is" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "New commentary from the game" })).toBeNull());
    expect(updates).toEqual([false]);
  });
});
