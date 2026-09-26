/**
 * Club Finances (Screen 39) and Board Confidence (Screen 47), group-c ticket 08.
 *
 * Both screens are half-modelled, so the assertions worth making are about the half that is *not*
 * there: neither may invent a figure, and Board Confidence has to say that supporter confidence is
 * missing rather than quietly showing only the board.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubId, SaveId } from "@cm-clone/contracts";
import { ClubFinancesDetailScreen } from "../../../src/renderer/clubFinancesDetail/ClubFinancesDetailScreen.js";
import { FinancesScreen } from "../../../src/renderer/finances/FinancesScreen.js";
import { BoardConfidenceScreen } from "../../../src/renderer/boardConfidence/BoardConfidenceScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const rid = (id: string): SaveId => SaveId.make(id);
const cid = (id: string): ClubId => ClubId.make(id);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>): void => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const respondTo = (method: string, value: unknown): void => {
  mockPreload(async (called) => {
    if (called === method) return { _tag: "Success", value } as never;
    return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
  });
};

const club = { id: cid("club-7"), name: "Northport Rovers", statureTier: "mid" };

const financesView = (options: { readonly isUserClub?: boolean; readonly headroom?: number } = {}) => ({
  club,
  isUserClub: options.isUserClub ?? true,
  transferBudgetRemaining: 2_000_000,
  wageBudget: 800_000,
  committedWages: 750_000,
  headroom: options.headroom ?? 50_000,
});

const boardView = (objective: unknown) => ({
  season: { seasonNumber: 1, currentDate: "2024-08-01", phase: "in_season", awaitingFixture: null },
  clubName: "Northport Rovers",
  objective,
});

beforeEach(() => {
  bindRouter({
    navigate: vi.fn(),
    history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

describe("ClubFinancesDetailScreen", () => {
  const renderIt = () =>
    render(
      <RegistryProvider>
        <ClubFinancesDetailScreen saveId={rid("s1")} clubId={cid("club-7")} />
      </RegistryProvider>,
    );

  it("titles the page with the club and shows the four budget figures", async () => {
    respondTo("getClubFinances", financesView());
    renderIt();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Northport Rovers", level: 1 })).toBeTruthy(),
    );
    expect(screen.getByText("Transfer Budget Remaining")).toBeTruthy();
    expect(screen.getByText("Wage Budget")).toBeTruthy();
    expect(screen.getByText("Committed Wages")).toBeTruthy();
    expect(screen.getByText("Headroom")).toBeTruthy();
  });

  it("marks a club that is not the manager's", async () => {
    respondTo("getClubFinances", financesView({ isUserClub: false }));
    renderIt();

    await waitFor(() => expect(screen.getByText("[Not your club]")).toBeTruthy());
  });

  /** Overspend carries a word as well as a colour — a red number alone tells some readers nothing. */
  it("says 'over budget' when headroom is negative, not only colours it", async () => {
    respondTo("getClubFinances", financesView({ headroom: -25_000 }));
    renderIt();

    await waitFor(() => expect(screen.getByText("(over budget)")).toBeTruthy());
  });

  /** The ledger defers income, expenditure and projections; an invented figure is worse than none. */
  it("shows nothing the ledger says has no model", async () => {
    respondTo("getClubFinances", financesView());
    renderIt();

    await waitFor(() => expect(screen.getByText("Headroom")).toBeTruthy());
    for (const absent of ["Income", "Expenditure", "Projection", "Balance", "Revenue"]) {
      expect(screen.queryByText(new RegExp(absent, "i"))).toBeNull();
    }
  });

  it("resolves the manager's own club through the Finances nav entry", async () => {
    mockPreload(async (method) => {
      if (method === "getSquad") {
        return { _tag: "Success", value: { club, players: [] } } as never;
      }
      if (method === "getClubFinances") {
        return { _tag: "Success", value: financesView() } as never;
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
    });

    render(
      <RegistryProvider>
        <FinancesScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Northport Rovers", level: 1 })).toBeTruthy(),
    );
    expect(screen.getByText("Transfer Budget Remaining")).toBeTruthy();
  });
});

describe("BoardConfidenceScreen", () => {
  const renderIt = () =>
    render(
      <RegistryProvider>
        <BoardConfidenceScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );

  it("shows the board's league objective for the season", async () => {
    respondTo(
      "getBoardConfidence",
      boardView({
        seasonNumber: 1,
        clubId: cid("club-7"),
        minPosition: 1,
        maxPosition: 6,
        finalPosition: null,
        verdict: null,
      }),
    );
    renderIt();

    await waitFor(() => expect(screen.getByText("Finish between 1 and 6")).toBeTruthy());
    expect(screen.getByText(/The season is still being played/)).toBeTruthy();
  });

  it("reads the verdict once the board has judged", async () => {
    respondTo(
      "getBoardConfidence",
      boardView({
        seasonNumber: 1,
        clubId: cid("club-7"),
        minPosition: 1,
        maxPosition: 6,
        finalPosition: 3,
        verdict: "met",
      }),
    );
    renderIt();

    await waitFor(() => expect(screen.getByText(/Finished 3\./)).toBeTruthy());
    expect(screen.getByText(/Verdict: Met\./)).toBeTruthy();
  });

  it("handles a career with no objective set yet", async () => {
    respondTo("getBoardConfidence", boardView(null));
    renderIt();

    await waitFor(() =>
      expect(screen.getByText("The board has not set an objective yet.")).toBeTruthy(),
    );
  });

  /**
   * The screen's name promises two things and delivers one. Saying so is the difference between a
   * deliberate gap and a screen a reader assumes is broken.
   */
  it("names supporter confidence as unmodelled rather than silently omitting it", async () => {
    respondTo("getBoardConfidence", boardView(null));
    renderIt();

    await waitFor(() =>
      expect(screen.getByText("Supporter confidence is not modelled in this game.")).toBeTruthy(),
    );
  });
});
