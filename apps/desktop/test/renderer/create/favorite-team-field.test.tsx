import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ClubId, SaveId } from "@cm-clone/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FavoriteTeamField } from "../../../src/renderer/create/FavoriteTeamField.js";

const COLOURS = {
  primary: { foreground: "#ffffff", background: "#1e3a8a" },
  secondary: { foreground: "#ffffff", background: "#b91c1c" },
  tertiary: null,
  quaternary: null,
};

const club = (clubId: string, clubName: string, leagueId: string) => ({
  clubId,
  clubName,
  leagueId,
  badgeKey: null,
  clubColours: COLOURS,
  statureTier: "mid",
  boardObjectiveMin: 5,
  boardObjectiveMax: 12,
  squadQualityBand: "Competitive",
  transferBudget: 0,
  wageBudget: 0,
  detail: { squadSize: 25, averageAge: 25, topPlayers: [] },
});

const VIEW = {
  clubs: [
    club("club-c", "Sevilla Norte", "comp_esp_1"),
    club("club-b", "Millbrook Town", "comp_eng_1"),
    club("club-a", "Castlemere United", "comp_eng_1"),
  ],
  leagues: [
    { leagueId: "comp_eng_1", leagueName: "English First Division", nationId: "nation_eng" },
    { leagueId: "comp_esp_1", leagueName: "Spanish First Division", nationId: "nation_esp" },
  ],
};

const installPreload = (): void => {
  (window as unknown as { cmClone: { call: () => Promise<unknown> } }).cmClone = {
    call: async () => ({ _tag: "Success", value: VIEW }),
  };
};

const openList = async (): Promise<HTMLElement> => {
  const input = screen.getByRole("combobox", { name: "Favorite team" });
  fireEvent.click(input);
  fireEvent.keyDown(input, { key: "ArrowDown" });
  return screen.findByRole("listbox");
};

afterEach(() => cleanup());

describe("FavoriteTeamField", () => {
  it("groups clubs under their league's nation and draws each club's crest", async () => {
    installPreload();
    render(<FavoriteTeamField saveId={"save-1" as SaveId} value={null} onSelect={() => undefined} />);

    const list = await openList();
    const groups = await within(list).findAllByRole("group");
    const headingOf = (group: HTMLElement): string | null =>
      document.getElementById(group.getAttribute("aria-labelledby") ?? "")?.textContent ?? null;
    expect(groups.map(headingOf)).toEqual(["England", "Spain"]);
    expect(within(groups[0]!).getAllByRole("option").map((option) => option.textContent)).toEqual([
      expect.stringContaining("Castlemere United"),
      expect.stringContaining("Millbrook Town"),
    ]);
    // No badge key, so the initials shield stands in for the logo.
    expect(within(groups[0]!).getByRole("img", { name: "Castlemere United crest" }).textContent).toBe("CU");
  });

  it("filters by nation name as well as club name", async () => {
    installPreload();
    render(<FavoriteTeamField saveId={"save-1" as SaveId} value={null} onSelect={() => undefined} />);
    await openList();

    fireEvent.change(screen.getByRole("combobox", { name: "Favorite team" }), {
      target: { value: "spain" },
    });

    await waitFor(() =>
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        expect.stringContaining("Sevilla Norte"),
      ]),
    );
  });

  it("reports the picked club, and clearing the input clears the pick", async () => {
    installPreload();
    const onSelect = vi.fn();
    const { rerender } = render(
      <FavoriteTeamField saveId={"save-1" as SaveId} value={null} onSelect={onSelect} />,
    );

    await openList();
    fireEvent.click(await screen.findByRole("option", { name: /Millbrook Town/ }));
    expect(onSelect).toHaveBeenLastCalledWith({ clubId: "club-b", clubName: "Millbrook Town" });

    rerender(
      <FavoriteTeamField
        saveId={"save-1" as SaveId}
        value={{ clubId: "club-b" as ClubId, clubName: "Millbrook Town" }}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Favorite team" })).toHaveProperty("value", "Millbrook Town");

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it("stays disabled until the world exists", () => {
    installPreload();
    render(<FavoriteTeamField saveId={null} value={null} onSelect={() => undefined} />);
    expect(screen.getByRole("combobox", { name: "Favorite team" })).toHaveProperty("disabled", true);
  });
});
