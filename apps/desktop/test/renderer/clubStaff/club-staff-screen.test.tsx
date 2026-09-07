// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubId, SaveId } from "@cm-clone/contracts";
import { STAFF_DEPARTMENTS, STATURE_TIERS } from "@cm-clone/shared";
import { ClubStaffScreen } from "../../../src/renderer/clubStaff/ClubStaffScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const rid = (id: string) => SaveId.make(id);
const cid = (id: string) => ClubId.make(id);
const tier = STATURE_TIERS[0];

const member = (role: string, firstName: string, lastName: string) => ({
  role,
  firstName,
  lastName,
});

/** The wire shape the main process produces: four groups in the derivation's fixed order. */
const staffView = (clubId: string, clubName: string) => ({
  club: { id: cid(clubId), name: clubName, statureTier: tier },
  groups: [
    { department: "executive", members: [member("president", "Alan", "Reyes")] },
    { department: "coaching", members: [member("coach", "Diane", "Wax")] },
    {
      department: "recruitment",
      members: [member("scout", "Marcus", "Ito"), member("scout", "Elena", "Suarez")],
    },
    { department: "medical", members: [member("physio", "Thomas", "Bayard")] },
  ],
});

/** The renderer's own-club identity read: the squad view's `club` is the manager's club. */
const squadView = (ownClubId: string) => ({
  club: { id: cid(ownClubId), name: "My Club", statureTier: tier },
  players: [],
});

let navigateSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  navigateSpy = vi.fn();
  bindRouter({
    navigate: navigateSpy,
    history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

const mount = (clubId: string, ownClubId: string) => {
  mockPreload(async (method) => {
    if (method === "getClubStaff") {
      return { _tag: "Success", value: staffView(clubId, "Northport Rovers") } as never;
    }
    if (method === "getSquad") {
      return { _tag: "Success", value: squadView(ownClubId) } as never;
    }
    return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
  });
  return render(
    <RegistryProvider>
      <ClubStaffScreen saveId={rid("s1")} clubId={cid(clubId)} />
    </RegistryProvider>,
  );
};

describe("ticket 04 — the Club Staff page renders who works at the club", () => {
  it("renders the four department headings in the fixed Executive → Coaching → Recruitment → Medical order", async () => {
    mount("club-7", "club-7");

    await waitFor(() => {
      expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent?.trim())).toEqual(
        [...STAFF_DEPARTMENTS].map((d) =>
          d === "executive" ? "Executive" : d === "coaching" ? "Coaching" : d === "recruitment" ? "Recruitment" : "Medical",
        ),
      );
    });
  });

  it("each row reads as the role title and the person's name — never a quality", async () => {
    mount("club-7", "club-7");

    const rows = await screen.findAllByRole("listitem");
    expect(rows.map((li) => li.getAttribute("aria-label"))).toEqual([
      "President Alan Reyes",
      "Coach Diane Wax",
      "Scout Marcus Ito",
      "Scout Elena Suarez",
      "Physio Thomas Bayard",
    ]);
    // No row carries a 1-20 quality — a Coach row and a Physio row mean the same amount of thing.
    expect(screen.queryByText(/\b\d{1,2}\b/)).toBeNull();
  });

  it("marks a rival club [Not your club] and leaves the user's own club unmarked", async () => {
    // A rival: the viewed club (club-8) differs from the manager's own (club-7).
    mount("club-8", "club-7");
    await waitFor(() => {
      expect(screen.getByText("[Not your club]")).toBeTruthy();
    });

    // The manager's own club: no marker, the app's implicit default.
    cleanup();
    mount("club-7", "club-7");
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 }).textContent ?? "").toContain("Northport Rovers");
    });
    expect(screen.queryByText("[Not your club]")).toBeNull();
  });

  it("names the club in the `<main>` region's label", async () => {
    mount("club-7", "club-7");
    await waitFor(() => {
      expect(screen.getByRole("main", { name: /Northport Rovers/ })).toBeTruthy();
    });
  });

  it("renders no focusable row — arriving focus lands on the page's main region", async () => {
    await mount("club-7", "club-7");
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
    // A lobby server could answer with groups out of order; the page's promise is a fixed order.
    const scrambled = staffView("club-7", "Northport Rovers");
    scrambled.groups = [
      scrambled.groups[3]!,
      scrambled.groups[0]!,
      scrambled.groups[2]!,
      scrambled.groups[1]!,
    ];
    mockPreload(async (method) => {
      if (method === "getClubStaff") {
        return { _tag: "Success", value: scrambled } as never;
      }
      if (method === "getSquad") {
        return { _tag: "Success", value: squadView("club-7") } as never;
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
    });
    render(
      <RegistryProvider>
        <ClubStaffScreen saveId={rid("s1")} clubId={cid("club-7")} />
      </RegistryProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByRole("heading", { level: 2 }).length).toBe(4);
    });
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent?.trim());
    expect(headings[0]).toBe("Executive");
    expect(headings[1]).toBe("Coaching");
    expect(headings[2]).toBe("Recruitment");
    expect(headings[3]).toBe("Medical");
  });
});