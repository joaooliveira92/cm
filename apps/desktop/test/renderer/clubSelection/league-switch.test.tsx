import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import type { ClubId } from "@cm-clone/contracts";
import type { SquadQualityBand } from "@cm-clone/shared";
import { getClubSelection } from "../../../src/main/career/index.js";
import { filledSegments } from "../../../src/renderer/clubSelection/model.js";
import { ClubSelectionScreen } from "../../../src/renderer/clubSelection/ClubSelectionScreen.js";
import { createSave } from "../../seeded-save.js";
import { chooseOptionByLabel } from "../../setup/baseUiSelect.js";

/**
 * League scoping and the panel's quality meter, over the shipped read.
 *
 * A generated world has one League, so the real payload is split in two after the JSON round-trip:
 * its last ten clubs move to a second League. Everything else — decoding, the rail, the panel — is
 * the shipped path, as in `screen.test.tsx`.
 */

interface WireClub {
  clubId: string;
  clubName: string;
  leagueId: string;
  squadQualityBand: SquadQualityBand;
}
interface WirePayload {
  clubs: Array<WireClub>;
  leagues: Array<{ leagueId: string; leagueName: string; nationId: string | null }>;
}

const SECOND_LEAGUE = { leagueId: "second-league", leagueName: "Second League", nationId: null };

let savesDir = "";
let payload: WirePayload;
let firstLeagueName = "";

beforeAll(async () => {
  savesDir = await mkdtemp(path.join(tmpdir(), "cm-clone-league-switch-"));
  const save = await Effect.runPromise(createSave(savesDir, "League Switch Test"));
  const view = await Effect.runPromise(
    getClubSelection.pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${save.id}.sqlite`) })),
      Effect.scoped,
    ),
  );
  const wired = JSON.parse(JSON.stringify(view)) as WirePayload;
  payload = {
    clubs: wired.clubs.map((club, index) =>
      index < 10 ? club : { ...club, leagueId: SECOND_LEAGUE.leagueId },
    ),
    leagues: [...wired.leagues, SECOND_LEAGUE],
  };
  firstLeagueName = wired.leagues[0]!.leagueName;

  (window as unknown as { cmClone: { call: (m: string) => Promise<unknown> } }).cmClone = {
    call: async (method) =>
      method === "getClubSelection"
        ? { _tag: "Success", value: payload }
        : { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: save.id } },
  };
}, 180_000);

afterAll(() => rm(savesDir, { recursive: true, force: true }));

afterEach(cleanup);

type Selection = { readonly clubId: ClubId; readonly clubName: string } | null;

/** The screen with its selection held outside, recording every `onSelect` it makes. */
const renderScreen = () => {
  const reports: Array<Selection> = [];
  const Harness = () => {
    const [selected, setSelected] = useState<Selection>(null);
    return (
      <ClubSelectionScreen
        saveId={"save" as never}
        selectedClubId={selected?.clubId ?? null}
        onSelect={(club) => {
          reports.push(club);
          setSelected(club);
        }}
      />
    );
  };
  render(<Harness />);
  return { reports };
};

const rows = () =>
  within(screen.getByRole("table", { name: "Clubs" }))
    .getAllByRole("row")
    .filter((row) => within(row).queryAllByRole("columnheader").length === 0);

const nameOf = (row: HTMLElement): string => row.querySelector("span.block")!.textContent!;
const panel = () => screen.getByRole("region", { name: "Club detail" });
const announcer = () => within(panel()).getByRole("status");
const clubsOf = (leagueId: string) => payload.clubs.filter((club) => club.leagueId === leagueId);

const ready = async () => {
  renderScreen();
  await waitFor(() => expect(rows().length).toBe(10));
};

describe("the panel's Squad Quality card", () => {
  it("names the club's real band and fills the meter to its rank", async () => {
    await ready();
    const first = rows()[0]!;
    const club = payload.clubs.find((c) => c.clubName === nameOf(first))!;
    fireEvent.click(first);

    const card = (await within(panel()).findByText("Squad Quality")).closest("[data-slot=card]") as HTMLElement;
    expect(within(card).getByText(club.squadQualityBand)).toBeTruthy();
    const filled = card.querySelectorAll("[aria-hidden=true] > .bg-text-highlight").length;
    expect(filled).toBe(filledSegments(club.squadQualityBand));
    expect(filled).toBeGreaterThan(0);
    // A rank among six bands, not a measurement: no percentage is stated.
    expect(within(card).queryByText(/%/)).toBeNull();
  });
});

describe("switching the League", () => {
  it("clears a club selected in the League being left, and silences the announcer", async () => {
    const { reports } = renderScreen();
    await waitFor(() => expect(rows().length).toBe(10));
    const picked = nameOf(rows()[0]!);
    fireEvent.click(rows()[0]!);
    await waitFor(() => expect(announcer().textContent).toBe(`The panel shows ${picked}.`));

    await chooseOptionByLabel("League", SECOND_LEAGUE.leagueName);

    await waitFor(() => expect(rows().map(nameOf)).toEqual(clubsOf(SECOND_LEAGUE.leagueId).map((c) => c.clubName)));
    expect(reports.at(-1)).toBeNull();
    // Saying "The panel shows <club>" after that club left the screen would be a lie.
    expect(announcer().textContent).toBe("");
    expect(within(panel()).getByText(/10 clubs to choose from/)).toBeTruthy();
  });

  it("reselecting the current League changes nothing and says nothing new", async () => {
    const { reports } = renderScreen();
    await waitFor(() => expect(rows().length).toBe(10));
    const picked = nameOf(rows()[2]!);
    fireEvent.click(rows()[2]!);
    await waitFor(() => expect(announcer().textContent).toBe(`The panel shows ${picked}.`));
    const reportsBefore = reports.length;

    await chooseOptionByLabel("League", firstLeagueName);

    expect(reports.length).toBe(reportsBefore);
    expect(announcer().textContent).toBe(`The panel shows ${picked}.`);
    expect(rows()[2]!.getAttribute("aria-selected")).toBe("true");
    expect(within(panel()).getByRole("heading", { name: picked })).toBeTruthy();
  });

  it("switching with nothing selected reports nothing", async () => {
    const { reports } = renderScreen();
    await waitFor(() => expect(rows().length).toBe(10));

    await chooseOptionByLabel("League", SECOND_LEAGUE.leagueName);
    await waitFor(() => expect(nameOf(rows()[0]!)).toBe(clubsOf(SECOND_LEAGUE.leagueId)[0]!.clubName));

    expect(reports).toEqual([]);
    expect(announcer().textContent).toBe("");
  });

  it("still selects by mouse in the new League", async () => {
    const { reports } = renderScreen();
    await waitFor(() => expect(rows().length).toBe(10));
    fireEvent.click(rows()[0]!);

    await chooseOptionByLabel("League", SECOND_LEAGUE.leagueName);
    await waitFor(() => expect(nameOf(rows()[0]!)).toBe(clubsOf(SECOND_LEAGUE.leagueId)[0]!.clubName));

    const target = rows()[3]!;
    const name = nameOf(target);
    fireEvent.click(target);

    expect(reports.at(-1)?.clubName).toBe(name);
    await waitFor(() => expect(rows()[3]!.getAttribute("aria-selected")).toBe("true"));
    expect(announcer().textContent).toBe(`The panel shows ${name}.`);
  });

  it("still roves and selects by keyboard in the new League, with one tab stop", async () => {
    const { reports } = renderScreen();
    await waitFor(() => expect(rows().length).toBe(10));
    // Rove in the first League so the rail holds an active row that the switch then removes.
    const table = screen.getByRole("table", { name: "Clubs" });
    rows()[0]!.focus();
    fireEvent.keyDown(table, { key: "ArrowDown" });
    fireEvent.keyDown(table, { key: "Enter" });

    await chooseOptionByLabel("League", SECOND_LEAGUE.leagueName);
    await waitFor(() => expect(nameOf(rows()[0]!)).toBe(clubsOf(SECOND_LEAGUE.leagueId)[0]!.clubName));

    const stops = rows().filter((row) => row.getAttribute("tabindex") === "0");
    expect(stops).toEqual([rows()[0]]);

    stops[0]!.focus();
    fireEvent.keyDown(screen.getByRole("table", { name: "Clubs" }), { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows()[1]);
    fireEvent.keyDown(screen.getByRole("table", { name: "Clubs" }), { key: "Enter" });

    const name = nameOf(rows()[1]!);
    expect(reports.at(-1)?.clubName).toBe(name);
    await waitFor(() => expect(rows()[1]!.getAttribute("aria-selected")).toBe("true"));
    expect(announcer().textContent).toBe(`The panel shows ${name}.`);
  });
});
