/**
 * Club General Information (Screen 34, group-c ticket 06).
 *
 * Two subjects here. The screen renders only what has a model — the ledger `deferred`s ownership,
 * reputation, finances and facilities, and a screen that showed an invented figure would be worse
 * than the placeholder it replaced. And the own-club resolver hands off to this same screen, so
 * there is one implementation rather than the two that existed before.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubId, SaveId } from "@cm-clone/contracts";
import { ClubInformationScreen } from "../../../src/renderer/clubInformation/ClubInformationScreen.js";
import { ClubInfoScreen } from "../../../src/renderer/clubInfo/ClubInfoScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const rid = (id: string): SaveId => SaveId.make(id);
const cid = (id: string): ClubId => ClubId.make(id);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>): void => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const infoView = (options: { readonly isUserClub?: boolean } = {}) => ({
  club: { id: cid("club-7"), name: "Northport Rovers", statureTier: "mid" },
  isUserClub: options.isUserClub ?? true,
  cityName: "Northport",
  nationName: "England",
  stadiumName: "Harbour Park",
  stadiumCapacity: 24_500,
});

/** Answer one method and fail anything else, so a screen reaching a second read is caught. */
const respondTo = (method: string, value: unknown): void => {
  mockPreload(async (called) => {
    if (called === method) return { _tag: "Success", value } as never;
    return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
  });
};

beforeEach(() => {
  bindRouter({
    navigate: vi.fn(),
    history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

const renderScreen = () =>
  render(
    <RegistryProvider>
      <ClubInformationScreen saveId={rid("s1")} clubId={cid("club-7")} />
    </RegistryProvider>,
  );

describe("ClubInformationScreen", () => {
  it("shows the club's standing, town, nation and ground", async () => {
    respondTo("getClubInformation", infoView());
    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Northport Rovers", level: 1 })).toBeTruthy(),
    );
    expect(screen.getByText("Established club")).toBeTruthy();
    expect(screen.getByText("Northport")).toBeTruthy();
    expect(screen.getByText("England")).toBeTruthy();
    expect(screen.getByText("Harbour Park")).toBeTruthy();
  });

  /** Capacity is display-only, and a bare 24500 is not how a reader counts seats. */
  it("groups the capacity's digits", async () => {
    respondTo("getClubInformation", infoView());
    renderScreen();

    await waitFor(() => expect(screen.getByText(/24[,. ]500/)).toBeTruthy());
  });

  it("marks a club that is not the manager's", async () => {
    respondTo("getClubInformation", infoView({ isUserClub: false }));
    renderScreen();

    await waitFor(() => expect(screen.getByText("[Not your club]")).toBeTruthy());
  });

  it("does not mark the manager's own club", async () => {
    respondTo("getClubInformation", infoView({ isUserClub: true }));
    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Northport Rovers", level: 1 })).toBeTruthy(),
    );
    expect(screen.queryByText("[Not your club]")).toBeNull();
  });

  /**
   * The ledger `deferred`s all of these for want of a model. A screen that grew one of them would
   * be showing a number nobody generated, which is the failure the placeholder cull was about.
   */
  it("shows nothing the ledger says has no model", async () => {
    respondTo("getClubInformation", infoView());
    renderScreen();

    await waitFor(() => expect(screen.getByText("Harbour Park")).toBeTruthy());
    for (const absent of ["Reputation", "Owner", "Ownership", "Balance", "Training ground"]) {
      expect(screen.queryByText(new RegExp(absent, "i"))).toBeNull();
    }
  });

  it("reports a failed read instead of rendering an empty club", async () => {
    mockPreload(
      async () =>
        ({ _tag: "Failure", error: { _tag: "ClubNotFoundError", id: cid("club-7") } }) as never,
    );
    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Club Information", level: 1 })).toBeTruthy(),
    );
    expect(screen.queryByText("Harbour Park")).toBeNull();
  });
});

describe("ClubInfoScreen — the own-club resolver", () => {
  it("resolves the manager's club and hands off to the same screen", async () => {
    mockPreload(async (method) => {
      if (method === "getSquad") {
        return {
          _tag: "Success",
          value: { club: { id: cid("club-7"), name: "Northport Rovers", statureTier: "mid" }, players: [] },
        } as never;
      }
      if (method === "getClubInformation") {
        return { _tag: "Success", value: infoView() } as never;
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
    });

    render(
      <RegistryProvider>
        <ClubInfoScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );

    // The roster screen's own heading, not the resolver's: reaching it proves the hand-off.
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Northport Rovers", level: 1 })).toBeTruthy(),
    );
    expect(screen.getByText("Harbour Park")).toBeTruthy();
  });

  it("reports a failed squad read rather than handing off a club it does not have", async () => {
    mockPreload(
      async () => ({ _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } }) as never,
    );

    render(
      <RegistryProvider>
        <ClubInfoScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Club Information", level: 1 })).toBeTruthy(),
    );
    expect(screen.queryByText("Harbour Park")).toBeNull();
  });
});
