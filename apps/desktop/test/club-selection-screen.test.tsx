// @vitest-environment jsdom
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, afterAll, describe, expect, it } from "vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import type { ClubId } from "@cm-clone/contracts";
import { BASE_CONTENT_PACK, displayName } from "@cm-clone/shared";
import { getClubSelection } from "../src/main/clubSelection.js";
import { createSave } from "../src/main/saves.js";
import { ClubSelectionScreen } from "../src/renderer/ClubSelectionScreen.js";

/**
 * The shipped workspace over the shipped read.
 *
 * `getClubSelection` here is the real main-process Effect against a real generated world, and its
 * answer crosses a `JSON` round-trip before the screen sees it — the same seam
 * `league-selection-screen.test.tsx` uses. What is mocked is the IPC transport and nothing else,
 * so a payload that only decodes because a class instance survived in-process fails here.
 */

let savesDir = "";
let saveId = "";
const calls: Array<string> = [];

const wire = (value: unknown): unknown => JSON.parse(JSON.stringify(value)) as unknown;

beforeAll(async () => {
  savesDir = await mkdtemp(path.join(tmpdir(), "cm-clone-club-selection-"));
  const save = await Effect.runPromise(createSave(savesDir, "Club Selection Test"));
  saveId = save.id;

  // The real query runs once against the real generated world and its answer is wired; the
  // handler is a pure read of a world that cannot change while the screen is open, so re-running
  // it per test would buy nothing but twenty squad loads each time.
  const view = await Effect.runPromise(
    getClubSelection.pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
      Effect.scoped,
    ),
  );
  const payload = wire(view);

  (window as unknown as { cmClone: { call: (m: string, p: unknown) => Promise<unknown> } }).cmClone = {
    call: async (method) => {
      calls.push(method);
      return method === "getClubSelection"
        ? { _tag: "Success", value: payload }
        : { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: saveId } };
    },
  };
}, 180_000);

afterAll(() => rm(savesDir, { recursive: true, force: true }));

afterEach(cleanup);

/** The screen with the selection held outside it, the way the creation session holds it. */
const Harness = ({ report }: { readonly report: (club: Selection) => void }) => {
  const [selected, setSelected] = useState<Selection>(null);
  return (
    <ClubSelectionScreen
      saveId={saveId as never}
      selectedClubId={selected?.clubId ?? null}
      onSelect={(club) => {
        setSelected(club);
        report(club);
      }}
    />
  );
};

type Selection = { readonly clubId: ClubId; readonly clubName: string } | null;

const renderScreen = () => {
  let selected: Selection = null;
  render(<Harness report={(club) => (selected = club)} />);
  return { selectionOf: () => selected };
};

/** The rail's rows. Scoped to the listbox because the disabled league `<select>`'s single
 *  `<option>` carries the same implicit role. */
const options = () => within(screen.getByRole("listbox", { name: "Clubs" })).getAllByRole("option");

describe("the rail reads comparatively and the panel carries the detail", () => {
  it("renders one option per club carrying exactly name, stature tier and the quality band", async () => {
    renderScreen();
    await waitFor(() => expect(options().length).toBe(20));

    const row = options()[0]!;
    expect(row.textContent).toMatch(/(big|mid|small)/);
    // Board objective and both budgets are panel-only: a rail row that carried them would stop
    // being scannable, and the money would read twice.
    expect(row.textContent).not.toMatch(/Cr/);
    expect(row.textContent).not.toMatch(/Board/);
  });

  it("shows the league summary until a club is picked — not a spinner, not an empty state", async () => {
    renderScreen();
    const panel = await screen.findByRole("region", { name: "Club detail" });

    await waitFor(() => expect(within(panel).getByText(/20 clubs to choose from/)).toBeTruthy());
    expect(within(panel).queryByRole("status")?.textContent).toBe("");
  });

  it("fills the panel from the already-fetched payload, with no second call", async () => {
    renderScreen();
    await waitFor(() => expect(options().length).toBe(20));
    const before = calls.filter((method) => method === "getClubSelection").length;

    const first = options()[0]!;
    const name = first.querySelector("span")!.textContent!;
    fireEvent.click(first);

    const panel = screen.getByRole("region", { name: "Club detail" });
    await waitFor(() => expect(within(panel).getByText(name)).toBeTruthy());
    // The detail block: expectation prose, both budgets in Credits, the top five, size and age.
    expect(within(panel).getByText(/The board expects/)).toBeTruthy();
    expect(within(panel).getByText("Transfer Budget")).toBeTruthy();
    expect(within(panel).getByText("Wage Budget")).toBeTruthy();
    expect(within(panel).getAllByText(/ Cr$/).length).toBe(2);
    expect(within(panel).getByText(/Squad of 25, average age/)).toBeTruthy();
    expect(within(panel).getByRole("list", {}).children.length).toBeGreaterThan(0);

    expect(calls.filter((method) => method === "getClubSelection").length).toBe(before);
  });

  it("names the one generated League on a disabled selector with a stated reason", async () => {
    renderScreen();
    await waitFor(() => expect(options().length).toBe(20));

    const selector = screen.getByLabelText("League") as HTMLSelectElement;
    expect(selector.disabled).toBe(true);
    expect(selector.options.length).toBe(1);
    // The pack's name for the League, not a constant the renderer holds: the screen shows what
    // the save's content pack says `comp_eng_1` is called.
    expect(selector.options[0]!.textContent).toBe(
      displayName(BASE_CONTENT_PACK, "comp_eng_1"),
    );
    const hint = document.getElementById(selector.getAttribute("aria-describedby")!);
    expect(hint?.textContent).toMatch(/one League/);
  });
});

describe("`Pick a team for me`", () => {
  it("picks a club, announces it, and leaves focus on the button", async () => {
    const { selectionOf } = renderScreen();
    await waitFor(() => expect(options().length).toBe(20));

    const button = screen.getByRole("button", { name: "Pick a team for me" });
    button.focus();
    fireEvent.click(button);

    const picked = selectionOf()!;
    expect(picked).not.toBeNull();
    expect(document.activeElement).toBe(button);

    const panel = screen.getByRole("region", { name: "Club detail" });
    await waitFor(() =>
      expect(within(panel).getByRole("status").textContent).toBe(
        `Picked ${picked.clubName}. The panel shows ${picked.clubName}.`,
      ),
    );
  });

  it("never re-picks the club already selected", async () => {
    const { selectionOf } = renderScreen();
    await waitFor(() => expect(options().length).toBe(20));

    const button = screen.getByRole("button", { name: "Pick a team for me" });
    fireEvent.click(button);

    for (let press = 0; press < 20; press += 1) {
      const before = selectionOf()!.clubId;
      fireEvent.click(button);
      expect(selectionOf()!.clubId).not.toBe(before);
    }
  });
});

describe("the level-2 listbox", () => {
  it("roves with the arrows and Home/End without selecting anything", async () => {
    const { selectionOf } = renderScreen();
    await waitFor(() => expect(options().length).toBe(20));

    const listbox = screen.getByRole("listbox", { name: "Clubs" });
    const rows = options();
    expect(rows.filter((row) => row.getAttribute("tabindex") === "0").length).toBe(1);

    rows[0]!.focus();
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows[1]);
    fireEvent.keyDown(listbox, { key: "End" });
    expect(document.activeElement).toBe(rows[rows.length - 1]);
    fireEvent.keyDown(listbox, { key: "Home" });
    expect(document.activeElement).toBe(rows[0]);

    // Focus is not selection: roving alone picks nothing and says nothing.
    expect(selectionOf()).toBeNull();
    const panel = screen.getByRole("region", { name: "Club detail" });
    expect(within(panel).getByRole("status").textContent).toBe("");
  });

  it("selects the focused row on Enter and toggles it off on Space", async () => {
    const { selectionOf } = renderScreen();
    await waitFor(() => expect(options().length).toBe(20));

    const listbox = screen.getByRole("listbox", { name: "Clubs" });
    options()[0]!.focus();
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "Enter" });

    expect(selectionOf()).not.toBeNull();
    await waitFor(() => expect(options()[1]!.getAttribute("aria-selected")).toBe("true"));
    expect(options()[0]!.getAttribute("aria-selected")).toBe("false");

    fireEvent.keyDown(screen.getByRole("listbox", { name: "Clubs" }), { key: " " });
    expect(selectionOf()).toBeNull();
  });

  it("keeps the stature-tier badge on the selected row and codes selection beyond colour", async () => {
    renderScreen();
    await waitFor(() => expect(options().length).toBe(20));

    const first = options()[0]!;
    const tier = first.textContent!.match(/big|mid|small/)![0];
    fireEvent.click(first);

    await waitFor(() => expect(options()[0]!.getAttribute("aria-selected")).toBe("true"));
    const selectedRow = options()[0]!;
    expect(selectedRow.textContent).toContain(tier);
    // Fill, a left accent bar, and a marker — readable in greyscale, and distinct from the ring.
    expect(selectedRow.className).toContain("bg-row-selected");
    expect(selectedRow.className).toContain("border-l-text-highlight");
    expect(within(selectedRow).getByText("Selected")).toBeTruthy();
  });

  it("puts the assist after the list and skips the disabled selector in the tab order", async () => {
    renderScreen();
    await waitFor(() => expect(options().length).toBe(20));

    const stops = [...document.querySelectorAll<HTMLElement>("[tabindex='0'], button, select")].filter(
      (node) => !(node as HTMLButtonElement).disabled || node.tagName === "SELECT",
    );
    const reachable = stops.filter(
      (node) => !(node.tagName === "SELECT" && (node as HTMLSelectElement).disabled),
    );

    expect(reachable.map((node) => node.getAttribute("role") ?? node.tagName)).toEqual([
      "option",
      "BUTTON",
    ]);
  });
});

describe("the rail loads and fails independently of the panel", () => {
  const installTransport = (respond: () => Promise<unknown>): void => {
    (window as unknown as { cmClone: { call: () => Promise<unknown> } }).cmClone = {
      call: respond,
    };
  };

  it("shows skeleton rows while the read is in flight, with the chrome already mounted", async () => {
    installTransport(() => new Promise(() => {}));
    renderScreen();

    const rail = await screen.findByText("Loading clubs…");
    expect(rail.parentElement?.getAttribute("aria-busy")).toBe("true");
    expect(rail.parentElement?.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    // A slow read does not blank the screen: the selector, the assist and the panel are all there.
    expect(screen.getByLabelText("League")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pick a team for me" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Club detail" })).toBeTruthy();
  });

  it("renders a load failure inline in the rail, leaving the selector and assist in place", async () => {
    installTransport(async () => ({
      _tag: "Failure",
      error: { _tag: "SaveNotFoundError", id: saveId },
    }));
    renderScreen();

    await screen.findByText(/Failed to load clubs/);
    expect(screen.getByLabelText("League")).toBeTruthy();
    const assist = screen.getByRole("button", { name: "Pick a team for me" }) as HTMLButtonElement;
    // Disabled over zero rows: a pick that can roll nothing is meaningless.
    expect(assist.disabled).toBe(true);
    expect(screen.getByRole("region", { name: "Club detail" })).toBeTruthy();
  });
});
