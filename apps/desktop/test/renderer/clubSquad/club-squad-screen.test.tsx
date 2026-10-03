/**
 * Club Squad (Screen 35, group-c ticket 10): the any-club squad renders read-only through the
 * shared `SquadRoster` — the same row/table implementation the own-club lineup manager wraps —
 * with the figures ranged by Scouting Progress for a rival and exact for the manager's own club.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubId, PlayerId, SaveId } from "@cm-clone/contracts";
import { OUTFIELD_ATTRIBUTES } from "@cm-clone/shared";
import { ClubSquadScreen } from "../../../src/renderer/clubSquad/ClubSquadScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { getScreenIdentity } from "../../../src/renderer/screenIdentity.js";
import { ScreenToolbarSlot } from "../../../src/renderer/chrome/ScreenToolbarSlot.js";
import { positionSummaryFor } from "../../setup/positionFixtures.js";

const rid = (id: string): SaveId => SaveId.make(id);
const cid = (id: string): ClubId => ClubId.make(id);
const pid = (id: string): PlayerId => PlayerId.make(id);

const mockPreload = (impl: (method: string) => Promise<{ _tag: "Success"; value: unknown } | { _tag: "Failure"; error: unknown }>): void => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const respondTo = (method: string, value: unknown): void => {
  mockPreload(async (called) => {
    if (called === method) return { _tag: "Success", value } as never;
    return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
  });
};

const club = { id: cid("club-7"), name: "Northport Rovers", statureTier: "mid" };

/** The club's kit pair, as the wire carries it; the header paints the name on `background`. */
const clubColours = {
  primary: { foreground: "#ffffff", background: "#1d4ed8" },
  secondary: { foreground: "#ffffff", background: "#1e3a8a" },
  tertiary: null,
  quaternary: null,
};

const outfieldFigures = (figure: unknown): Record<string, unknown> =>
  Object.fromEntries(OUTFIELD_ATTRIBUTES.map((attribute) => [attribute, figure]));

/** One rival-squad row: every figure a Range, the shape progress below Fully Scouted takes. */
const rangedPlayer = (id: string) => ({
  id: pid(id),
  firstName: "Rui",
  lastName: "Costa",
  age: 27,
  attributes: outfieldFigures({ _tag: "range", low: 8, high: 20 }),
  positions: [{ position: "MC", familiarity: "natural" }],
  ...positionSummaryFor("MC"),
  overallRating: { _tag: "range", low: 50, high: 98 },
  nationality: "Portugal",
  birthplace: "Porto",
});

/** An own-club row: every figure exact. */
const exactPlayer = (id: string) => ({
  id: pid(id),
  firstName: "Rui",
  lastName: "Costa",
  age: 27,
  attributes: outfieldFigures({ _tag: "exact", value: 12 }),
  positions: [{ position: "MC", familiarity: "natural" }],
  ...positionSummaryFor("MC"),
  overallRating: { _tag: "exact", value: 74 },
  nationality: "Portugal",
  birthplace: "Porto",
});

const squadView = ({ isUserClub, players }: { readonly isUserClub: boolean; readonly players: readonly unknown[] }) => ({
  club,
  clubColours,
  isUserClub,
  players,
});

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
      <ClubSquadScreen saveId={rid("s1")} clubId={cid("club-7")} />
    </RegistryProvider>,
  );

describe("ClubSquadScreen — the any-club squad", () => {
  it("titles the page with the club and renders its squad read-only", async () => {
    respondTo("getClubSquad", squadView({ isUserClub: false, players: [rangedPlayer("p1")] }));
    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Northport Rovers/, level: 1 })).toBeTruthy(),
    );
    // The club name is painted in the club's own kit, not the screen's default text colour.
    const namePill = screen.getByRole("heading", { level: 1 }).querySelector("span");
    expect(namePill?.textContent).toBe("Northport Rovers");
    expect(namePill?.style.backgroundColor).toBe("#1d4ed8");
    expect(namePill?.style.color).toBe("#ffffff");
    // The roster shows the shared columns only: no Status/Condition/Training Focus (fields a
    // rival's read does not carry), and the figures as `low–high` Attribute Ranges.
    for (const absent of ["Status", "Condition", "Training Focus"]) {
      expect(screen.queryByText(absent)).toBeNull();
    }
    expect(screen.getByText(/Rui Costa/)).toBeTruthy();
    // The ranged cells are many (`8–20` per Attribute, plus the OVR band), so `getAllByText`.
    expect(screen.getAllByText(/\d+–\d+/).length).toBeGreaterThan(0);
  });

  it("offers no attribute filter: a rival's figures are banded, so a threshold would read through them", async () => {
    respondTo("getClubSquad", squadView({ isUserClub: false, players: [rangedPlayer("p1")] }));
    // The toolbar slot is mounted so a control this screen registered would render (group-e 04).
    render(
      <RegistryProvider>
        <ScreenToolbarSlot />
        <ClubSquadScreen saveId={rid("s1")} clubId={cid("club-7")} />
      </RegistryProvider>,
    );
    await screen.findByText(/Rui Costa/);
    expect(screen.queryByRole("button", { name: "Filter squad by attribute" })).toBeNull();
  });

  it("marks a club that is not the manager's", async () => {
    respondTo("getClubSquad", squadView({ isUserClub: false, players: [rangedPlayer("p1")] }));
    renderScreen();

    await waitFor(() => expect(screen.getByText("[Not your club]")).toBeTruthy());
  });

  it("names the rival club in the navbar identity slot, and restores the manager's on the way out", async () => {
    respondTo("getClubSquad", squadView({ isUserClub: false, players: [rangedPlayer("p1")] }));
    const { unmount } = renderScreen();

    await waitFor(() =>
      expect(getScreenIdentity()).toMatchObject({
        kind: "club",
        name: "Northport Rovers",
        qualifier: "Not your club",
        colours: clubColours,
      }),
    );
    unmount();
    expect(getScreenIdentity()).toBeNull();
  });

  it("leaves the identity slot alone for the manager's own club", async () => {
    respondTo("getClubSquad", squadView({ isUserClub: true, players: [exactPlayer("p1")] }));
    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Northport Rovers/, level: 1 })).toBeTruthy(),
    );
    expect(getScreenIdentity()).toBeNull();
  });

  it("renders the manager's own club exact and unmarked", async () => {
    respondTo("getClubSquad", squadView({ isUserClub: true, players: [exactPlayer("p1")] }));
    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Northport Rovers/, level: 1 })).toBeTruthy(),
    );
    expect(screen.queryByText("[Not your club]")).toBeNull();
    // Exact figures only — the en-dash band never appears.
    expect(screen.queryByText(/\d+–\d+/)).toBeNull();
  });

  it("reports a failed read instead of rendering an empty squad", async () => {
    mockPreload(async () => ({ _tag: "Failure", error: { _tag: "ClubNotFoundError", id: cid("club-7") } }) as never);
    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Club Squad", level: 1 })).toBeTruthy(),
    );
    expect(screen.queryByText("Northport Rovers")).toBeNull();
  });

  it("says so when a club's squad is empty, rather than showing a blank roster", async () => {
    respondTo("getClubSquad", squadView({ isUserClub: false, players: [] }));
    renderScreen();

    await waitFor(() =>
      expect(screen.getByText("This club has no players.")).toBeTruthy(),
    );
  });
});