import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubId, PlayerId, SaveId } from "@cm-clone/contracts";
import { clearScreenBottomBarActions } from "../../../src/renderer/chrome/bottom-bar/index.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { PlayerSearchScreen } from "../../../src/renderer/playerSearch/PlayerSearchScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { RegisteredScreenBar } from "../registered-screen-bar.js";
import { positionSummaryFor } from "../../setup/positionFixtures.js";

/**
 * Player Search's verbs live in the shell's bottom bar: View Profile opens the row under the
 * table's cursor, and Compare opens the ticked rows. Neither is registered before a search has
 * results to act on.
 */

const saveId = SaveId.make("s1");

const result = (id: string, firstName: string, lastName: string) => ({
  id: PlayerId.make(id),
  firstName,
  lastName,
  age: 24,
  clubId: ClubId.make("club-7"),
  clubName: "Northport Rovers",
  nationality: "nation_eng",
  positions: [{ position: "ST", familiarity: "natural" }],
  ...positionSummaryFor("ST"),
  overallRating: { _tag: "range", low: 60, high: 70 },
  transferValue: { _tag: "range", low: 1_000_000, high: 2_000_000 },
});

const RESULTS = [result("p-1", "Ada", "Striker"), result("p-2", "Ben", "Keeper"), result("p-3", "Cy", "Winger")];

let navigations: Array<{ to: string; params: Record<string, unknown> }>;

const install = () => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) =>
      method === "getPlayerSearch"
        ? { _tag: "Success", value: { total: RESULTS.length, results: RESULTS } }
        : { _tag: "Failure", error: { _tag: "SaveNotFoundError", saveId } },
  };
};

const mount = () =>
  render(
    <RegistryProvider>
      <PlayerSearchScreen saveId={saveId} />
      <RegisteredScreenBar />
    </RegistryProvider>,
  );

const footer = (): HTMLElement => {
  const element = document.querySelector("footer");
  if (element === null) throw new Error("no bottom bar rendered");
  return element;
};

const search = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  await screen.findByRole("button", { name: "Ada Striker" });
};

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  navigations = [];
  install();
  bindRouter({
    navigate: (to: { to: string; params: Record<string, unknown> }) => navigations.push(to),
    history: { back: () => {}, forward: () => {}, canGoBack: () => false },
  } as never);
});

afterEach(() => {
  cleanup();
  clearScreenBottomBarActions();
  vi.unstubAllGlobals();
});

describe("Player Search's bottom bar", () => {
  it("registers nothing before a search has results", () => {
    mount();
    expect(within(footer()).queryByRole("button")).toBeNull();
  });

  it("opens the first row's profile when the cursor has not moved", async () => {
    mount();
    await search();

    fireEvent.click(within(footer()).getByRole("button", { name: "View Profile" }));

    expect(navigations.at(-1)).toMatchObject({
      to: "/career/$saveId/player/$playerId/profile",
      params: { saveId, playerId: "p-1" },
    });
  });

  it("opens the profile of the row the cursor moved to", async () => {
    mount();
    await search();

    // The cursor follows focus (arrow keys, Tab); a click on the name opens the profile outright.
    fireEvent.focus(screen.getByRole("button", { name: "Cy Winger" }));
    fireEvent.click(within(footer()).getByRole("button", { name: "View Profile" }));

    expect(navigations.at(-1)?.params).toMatchObject({ playerId: "p-3" });
  });

  it("holds Compare until two players are ticked, and says so", async () => {
    mount();
    await search();

    const compare = within(footer()).getByRole("button", { name: "Compare" });
    expect((compare as HTMLButtonElement).disabled).toBe(true);
    expect(within(footer()).getByText("Tick at least two players to compare them.")).toBeTruthy();

    fireEvent.click(screen.getByRole("checkbox", { name: "Compare Ada Striker" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Compare Cy Winger" }));
    fireEvent.click(within(footer()).getByRole("button", { name: "Compare 2 players" }));

    expect(navigations.at(-1)).toMatchObject({ to: "/career/$saveId/player-comparison/$playerIds" });
    expect(within(footer()).queryByText("Tick at least two players to compare them.")).toBeNull();
  });

  it("no longer carries a Compare button in the results panel", async () => {
    mount();
    await search();

    const results = screen.getByRole("heading", { name: "Results" }).parentElement!;
    expect(within(results).queryByRole("button", { name: /^Compare/ })).toBeNull();
  });
});
