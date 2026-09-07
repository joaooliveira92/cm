// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubStaffScreen } from "../../../src/renderer/clubStaff/ClubStaffScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import {
  cid,
  mockPreload,
  populatedStaffView,
  respondWithStaff,
  rid,
  type ClubStaffViewWire,
} from "./fixtures.js";

const DEPARTMENT_HEADINGS = ["Executive", "Coaching", "Recruitment", "Medical"];

let navigateSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  navigateSpy = vi.fn();
  bindRouter({
    navigate: navigateSpy,
    history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

const renderScreen = (clubId = "club-7") =>
  render(
    <RegistryProvider>
      <ClubStaffScreen saveId={rid("s1")} clubId={cid(clubId)} />
    </RegistryProvider>,
  );

const mount = (view: ClubStaffViewWire) => {
  respondWithStaff(view);
  return renderScreen(view.club.id);
};

const headings = () =>
  screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent?.trim());

describe("ticket 04 — the Club Staff page renders who works at the club", () => {
  it("renders the four department headings in the fixed Executive → Coaching → Recruitment → Medical order", async () => {
    mount(populatedStaffView());

    await waitFor(() => {
      expect(headings()).toEqual(DEPARTMENT_HEADINGS);
    });
  });

  it("each row reads as the role title and the person's name", async () => {
    mount(populatedStaffView());

    const rows = await screen.findAllByRole("listitem");
    expect(rows.map((li) => li.getAttribute("aria-label"))).toEqual([
      "President Alan Reyes",
      "Coach Diane Wax",
      "Scout Marcus Ito",
      "Scout Elena Suarez",
      "Physio Thomas Bayard",
    ]);
  });

  it("shows no quality on any row — a Coach row and a Physio row mean the same amount of thing", async () => {
    mount(populatedStaffView());

    const rows = await screen.findAllByRole("listitem");
    // Asserted over the rows themselves rather than the page: a page-wide text probe passes for
    // reasons that have nothing to do with qualities (there is no digit in the chrome either), so
    // it would keep passing if a rating were added inside a row's markup.
    for (const row of rows) {
      expect(row.textContent ?? "").not.toMatch(/\d/);
    }
  });

  it("marks a rival club [Not your club] and leaves the user's own club unmarked", async () => {
    mount(populatedStaffView({ clubId: "club-8", isUserClub: false }));
    await waitFor(() => {
      expect(screen.getByText("[Not your club]")).toBeTruthy();
    });

    cleanup();
    mount(populatedStaffView({ clubId: "club-7", isUserClub: true }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 }).textContent ?? "").toContain(
        "Northport Rovers",
      );
    });
    expect(screen.queryByText("[Not your club]")).toBeNull();
  });

  it("names the club in the `<main>` region's label", async () => {
    mount(populatedStaffView());
    await waitFor(() => {
      expect(screen.getByRole("main", { name: /Northport Rovers/ })).toBeTruthy();
    });
  });

  it("renders no focusable row", async () => {
    mount(populatedStaffView());
    const rows = await screen.findAllByRole("listitem");
    expect(rows.length).toBeGreaterThan(0);
    const focusable = [
      // `[tabindex]` unqualified: a row given any tabindex is a focusable row, which is the
      // regression this guards. Scoped to `<main>` so the harness's own chrome never counts.
      ...document.querySelectorAll("main :is(button, a, [tabindex], input, select, textarea)"),
    ];
    expect(focusable).toHaveLength(0);
    const main = document.querySelector("main") as HTMLElement;
    expect(main.tabIndex).toBe(-1);
  });

  it("re-orders wire groups that arrive out of order back into the promised department order", async () => {
    const view = populatedStaffView();
    const scrambled: ClubStaffViewWire = {
      ...view,
      groups: [view.groups[3]!, view.groups[0]!, view.groups[2]!, view.groups[1]!],
    };
    mount(scrambled);

    await waitFor(() => {
      expect(headings()).toEqual(DEPARTMENT_HEADINGS);
    });
  });

  it("renders all four headings even when the wire omits a department, so a broken read cannot read as an empty backroom", async () => {
    const view = populatedStaffView();
    const missingMedical: ClubStaffViewWire = {
      ...view,
      groups: view.groups.filter((group) => group.department !== "medical"),
    };
    mount(missingMedical);

    await waitFor(() => {
      expect(headings()).toEqual(DEPARTMENT_HEADINGS);
    });
    // Four headings, but only the four people the wire actually carried.
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("renders the failure's own sentence as the error state", async () => {
    mockPreload(async () => ({
      _tag: "Failure",
      error: { _tag: "ClubNotFoundError", id: cid("club-404") },
    }) as never);
    renderScreen("club-404");

    await waitFor(() => {
      expect(screen.getByRole("main", { name: "Club staff" })).toBeTruthy();
    });
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("still renders the error surface when the bridge itself fails, not a blank page", async () => {
    // The bridge rejecting is the one failure that carries no answer at all — the screen has
    // nothing to name, and must still land on the error surface rather than an empty region.
    mockPreload(async () => {
      throw new Error("preload bridge is gone");
    });
    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole("main", { name: "Club staff" })).toBeTruthy();
    });
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
