// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { ManagerProfileScreen } from "../src/renderer/ManagerProfileScreen.js";
import { RegistryProvider } from "../src/renderer/rpc.js";

const saveId = SaveId.make("s1");

const profileView = (overrides: Record<string, unknown> = {}) => ({
  profile: {
    managerName: "Ada Lovelace",
    archetypeOrigin: "academy_head",
    pillars: { tacticalAcumen: 2, influence: 4, regimen: 1, technicalCoaching: 5 },
  },
  clubName: "Test FC",
  seasonNumber: 3,
  tenureSeasons: 3,
  archived: false,
  ...overrides,
});

const mockPreload = (value: unknown) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) =>
      method === "getManagerProfileScreen"
        ? { _tag: "Success", value }
        : { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: saveId } },
  };
};

const mount = () =>
  render(
    <RegistryProvider>
      <ManagerProfileScreen saveId={saveId} />
    </RegistryProvider>,
  );

beforeEach(cleanup);
afterEach(cleanup);

describe("Manager Profile (Screen 19)", () => {
  it("renders manager name, archetype, the four Pillars, club, season, and tenure", async () => {
    mockPreload(profileView());
    mount();

    expect(await screen.findByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("Academy Head")).toBeTruthy();
    expect(screen.getByText("Test FC")).toBeTruthy();
    expect(screen.getByText("Season 3")).toBeTruthy();
    expect(screen.getByText("Tenure: 3 seasons")).toBeTruthy();

    for (const pillar of ["Tactical Acumen", "Influence", "Regimen", "Technical Coaching"]) {
      expect(screen.getByText(pillar)).toBeTruthy();
    }
    // The values themselves, in the pillar order the domain fixes.
    const values = screen.getAllByRole("definition").map((node) => node.textContent);
    expect(values).toEqual(["2", "4", "1", "5"]);
  });

  it("names a Custom Manager rather than showing the raw archetype key", async () => {
    mockPreload(profileView({ profile: { ...profileView().profile, archetypeOrigin: "custom" } }));
    mount();
    expect(await screen.findByText("Custom Manager")).toBeTruthy();
  });

  it("singularises a one-season tenure", async () => {
    mockPreload(profileView({ seasonNumber: 1, tenureSeasons: 1 }));
    mount();
    expect(await screen.findByText("Tenure: 1 season")).toBeTruthy();
  });

  it("badges a live save Active with no archived banner", async () => {
    mockPreload(profileView());
    mount();
    expect(await screen.findByText("Active")).toBeTruthy();
    expect(screen.queryByText(/\[Archived\]/)).toBeNull();
  });

  it("badges an archived save Archived and banners it, keeping the same profile layout", async () => {
    mockPreload(profileView({ archived: true }));
    mount();
    expect(await screen.findByText("Archived")).toBeTruthy();
    expect(screen.getByText(/\[Archived\]/)).toBeTruthy();
    expect(screen.queryByText("Active")).toBeNull();
    // Identity is still fully rendered — archived is read-only, not a different screen.
    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("Test FC")).toBeTruthy();
    expect(screen.getByText("Tactical Acumen")).toBeTruthy();
  });

  it("never restates Season Summary's judgments", async () => {
    mockPreload(profileView({ archived: true }));
    mount();
    await screen.findByText("Ada Lovelace");
    for (const owned of [/Board Objective/i, /Verdict/i, /Consecutive/i, /warn/i, /sacked/i]) {
      expect(screen.queryByText(owned)).toBeNull();
    }
  });

  it("renders the typed SaveNotFoundError from the seam union", async () => {
    (window as unknown as { cmClone: { call: unknown } }).cmClone = {
      call: async () => ({ _tag: "Failure", error: { _tag: "SaveNotFoundError", id: saveId } }),
    };
    mount();
    expect(await screen.findByText("That save could not be found.")).toBeTruthy();
  });
});
