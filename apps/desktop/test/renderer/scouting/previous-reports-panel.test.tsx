import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

/** Team Scout Report ticket 08: the Previous Reports tab lists filed readings and compares one. */

let readings: ReadonlyArray<unknown>;

const install = () => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) => {
      switch (method) {
        case "getTeamScoutReport":
          return {
            _tag: "Success",
            value: reportFor(target, "Northport Rovers", {
              reportId: "club-7:2024-09-01",
              observedAt: "2024-09-01",
              knowledgeConfidence: "high",
            }),
          };
        case "getTeamScoutReadings":
          return { _tag: "Success", value: { targetClubId: target, readings } };
        case "getManagerProfileScreen":
          return { _tag: "Success", value: profileView(false) };
        case "getFixtures":
          return { _tag: "Success", value: fixturesView(false) };
        case "getSquad":
          return { _tag: "Success", value: squadView };
        default:
          return NOT_FOUND;
      }
    },
  };
};

const openPreviousTab = async () => {
  render(
    <RegistryProvider>
      <TeamScoutReportScreen saveId={saveId} clubId={target} />
    </RegistryProvider>,
  );
  const tabs = within(await screen.findByRole("tablist", { name: "Report sections" }));
  fireEvent.click(tabs.getByRole("tab", { name: "Previous Reports" }));
};

beforeEach(() => {
  bindRouter({
    navigate: () => {},
    history: { back: () => {}, forward: () => {}, canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

describe("ticket 08 — Previous Reports", () => {
  it("says plainly when no reading has been kept yet", async () => {
    readings = [];
    install();
    await openPreviousTab();

    await screen.findByText(/No earlier readings yet/);
  });

  it("lists filed readings in the order given, newest first, and compares the chosen one", async () => {
    readings = [
      reportFor(target, "Northport Rovers", {
        reportId: "club-7:2024-08-20",
        observedAt: "2024-08-20",
        knowledgeConfidence: "moderate",
      }),
      reportFor(target, "Northport Rovers", {
        reportId: "club-7:2024-08-01",
        observedAt: "2024-08-01",
        knowledgeConfidence: "low",
        predictedFormation: null,
      }),
    ];
    install();
    await openPreviousTab();

    const dates = (await screen.findAllByRole("button", { name: /^2024-08-/ })).map((b) => b.textContent);
    expect(dates).toEqual(["2024-08-20", "2024-08-01"]);

    fireEvent.click(screen.getByRole("button", { name: "2024-08-01" }));

    await screen.findByRole("heading", { name: "Changes since 2024-08-01" });
    expect(screen.getByText("Knowledge: Low → High")).toBeTruthy();
    expect(screen.getByText("Predicted formation: Unknown → 4-3-3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "2024-08-01" }).getAttribute("aria-pressed")).toBe("true");
  });
});
