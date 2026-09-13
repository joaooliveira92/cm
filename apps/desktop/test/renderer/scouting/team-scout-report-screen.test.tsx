// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ClubId, PlayerId } from "@cm-clone/contracts";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { TeamScoutReportScreen } from "../../../src/renderer/scouting/TeamScoutReportScreen.js";
import {
  NOT_FOUND,
  fixturesView,
  profileView,
  reportFor,
  saveId,
  squadView,
  target,
} from "./reportFixtures.js";

interface Answers {
  readonly report?: (payload: { clubId: string }) => Promise<unknown>;
  readonly archived?: boolean;
  readonly atBoundary?: boolean;
}

const mockPreload = ({ report, archived = false, atBoundary = false }: Answers) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: { clubId: string }) => {
      switch (method) {
        case "getTeamScoutReport":
          return report === undefined
            ? { _tag: "Success", value: reportFor(payload.clubId, "Northport Rovers") }
            : report(payload);
        case "getManagerProfileScreen":
          return { _tag: "Success", value: profileView(archived) };
        case "getFixtures":
          return { _tag: "Success", value: fixturesView(atBoundary) };
        case "getSquad":
          return { _tag: "Success", value: squadView };
        default:
          return NOT_FOUND;
      }
    },
  };
};

const mount = (clubId: ClubId = target) =>
  render(
    <RegistryProvider>
      <TeamScoutReportScreen saveId={saveId} clubId={clubId} />
    </RegistryProvider>,
  );

const reportState = () =>
  document.querySelector("[data-focus-id='teamScoutReport']")?.getAttribute("data-report-state");

let navigations: Array<unknown>;

beforeEach(() => {
  navigations = [];
  bindRouter({
    navigate: (options: unknown) => navigations.push(options),
    history: { back: () => {}, forward: () => {}, canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

describe("ticket 06 — the report's contents", () => {
  it("shows the header, recent form, strengths, weaknesses, and key players", async () => {
    mockPreload({});
    mount();

    await screen.findByRole("heading", { name: "Northport Rovers" });
    expect(screen.getByText("Sam Seeker")).toBeTruthy();
    expect(screen.getByText("2024-08-01")).toBeTruthy();
    expect(screen.getByText("Moderate")).toBeTruthy();
    expect(screen.getByText("Won")).toBeTruthy();
    expect(screen.getByText("Quick through the middle")).toBeTruthy();
    expect(screen.getByText("Slow to turn at full-back")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nico Striker" })).toBeTruthy();
  });

  it("shows the predicted formation and set-piece findings under Tactical View", async () => {
    mockPreload({});
    mount();

    fireEvent.click(await screen.findByRole("tab", { name: "Tactical View" }));

    await screen.findByText("4-3-3 (High confidence)");
    expect(screen.getByText("Crowds the near post")).toBeTruthy();
  });

  it("renders a below-Fully-Scouted key player's ability as a range, never one figure", async () => {
    mockPreload({});
    mount();

    const row = (await screen.findByRole("button", { name: "Nico Striker" })).closest("li")!;
    expect(row.textContent).toContain("Ability 58–71");
    expect(row.textContent).not.toMatch(/Ability \d+ /);
  });

  it("opens a key player's profile", async () => {
    mockPreload({});
    mount();

    fireEvent.click(await screen.findByRole("button", { name: "Nico Striker" }));

    expect(navigations).toContainEqual(
      expect.objectContaining({
        to: "/career/$saveId/player/$playerId/profile",
        params: { saveId, playerId: PlayerId.make("p-9") },
      }),
    );
  });
});

describe("ticket 06 — the tab shell", () => {
  it("carries all four tabs", async () => {
    mockPreload({});
    mount();

    const tabs = within(await screen.findByRole("tablist", { name: "Report sections" }));
    for (const name of ["Squad", "Tactical View", "Previous Reports", "Assign Scout"]) {
      expect(tabs.getByRole("tab", { name })).toBeTruthy();
    }


  });
});

describe("ticket 06 — the upcoming fixture", () => {
  it("offers the earliest unplayed meeting and opens Fixtures when the Calendar is elsewhere", async () => {
    mockPreload({});
    mount();

    const button = await screen.findByRole("button", {
      name: "Upcoming fixture: Northport Rovers (away), 2024-08-10",
    });
    fireEvent.click(button);

    expect(navigations).toContainEqual(
      expect.objectContaining({ to: "/career/$saveId/fixtures" }),
    );
  });

  it("opens Match day when the Calendar is stopped at that Fixture", async () => {
    mockPreload({ atBoundary: true });
    mount();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Go to Match day: Northport Rovers (away), 2024-08-10",
      }),
    );

    expect(navigations).toContainEqual(expect.objectContaining({ to: "/career/$saveId/match" }));
  });
});

describe("ticket 06 — view states", () => {
  it("loading while nothing has arrived", async () => {
    mockPreload({ report: () => new Promise(() => {}) });
    mount();

    await screen.findByText("Loading scout report...");
    expect(reportState()).toBe("loading");
  });

  it("empty when nobody has scouted the club", async () => {
    mockPreload({
      report: async () => ({ _tag: "Failure", error: { _tag: "ClubNotScoutedError", clubId: target, currentReportId: "club-7:2024-08-01" } }),
    });
    mount();

    await screen.findByText(/have not watched this club yet/);
    expect(reportState()).toBe("empty");
  });

  it("unavailable when the club does not exist", async () => {
    mockPreload({
      report: async () => ({ _tag: "Failure", error: { _tag: "ClubNotFoundError", id: target } }),
    });
    mount();

    await waitFor(() => expect(reportState()).toBe("unavailable"));
  });

  it("error for any other failure", async () => {
    mockPreload({ report: async () => NOT_FOUND });
    mount();

    await waitFor(() => expect(reportState()).toBe("error"));
  });

  it("permission-limited on an Archived Save, still showing the report", async () => {
    mockPreload({ archived: true });
    mount();

    await screen.findByText(/This career has ended/);
    expect(reportState()).toBe("permission-limited");
    expect(screen.getByRole("heading", { name: "Northport Rovers" })).toBeTruthy();
  });
});

describe("ticket 06 — stale responses", () => {
  it("a late response for the previously viewed club is never rendered", async () => {
    let releaseOld: (value: unknown) => void = () => {};
    mockPreload({
      report: ({ clubId }) =>
        clubId === "club-7"
          ? new Promise((resolve) => {
              releaseOld = resolve;
            })
          : Promise.resolve({ _tag: "Success", value: reportFor(clubId, "Eastvale United") }),
    });
    const view = mount(target);

    view.rerender(
      <RegistryProvider>
        <TeamScoutReportScreen saveId={saveId} clubId={ClubId.make("club-9")} />
      </RegistryProvider>,
    );
    await screen.findByRole("heading", { name: "Eastvale United" });

    // The old club's read now completes, but carrying a report that names the wrong club for this
    // route, as a slow response would.
    releaseOld({ _tag: "Success", value: reportFor("club-7", "Northport Rovers") });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole("heading", { name: "Northport Rovers" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Eastvale United" })).toBeTruthy();
  });
});
