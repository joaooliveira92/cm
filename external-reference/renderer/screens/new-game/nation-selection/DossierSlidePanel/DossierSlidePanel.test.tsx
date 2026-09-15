/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { PLAYABLE_SLOT_COUNTRY_IDS } from "@/content/nationAssetManifest.js";
import { NATION_DOSSIER_FIELDS } from "@/content/nationDossierFields.js";
import { NATION_FLAVOR_TEXT } from "@/content/nationFlavorText.js";
import { DossierSlidePanel } from "./DossierSlidePanel.js";

beforeEach(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

function renderPanel(countryId: (typeof PLAYABLE_SLOT_COUNTRY_IDS)[number]) {
  const onChangeNation = vi.fn();
  const onConfirm = vi.fn();
  const onRecommendedSetup = vi.fn();
  render(
    <DossierSlidePanel
      countryId={countryId}
      isOpen
      onChangeNation={onChangeNation}
      onConfirm={onConfirm}
      onRecommendedSetup={onRecommendedSetup}
    />,
  );
  return { onChangeNation, onConfirm, onRecommendedSetup };
}

describe("DossierSlidePanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the appointment title and nation name, with no date", () => {
    renderPanel("gb");

    expect(screen.getByText(/You have been appointed First Sea Lord/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "United Kingdom" })).toBeTruthy();
    expect(screen.queryByText(/Admiralty Intelligence Dossier/i)).toBeNull();
    expect(screen.queryByText(/1880/)).toBeNull();
  });

  it("never shows a Compare Nations control", () => {
    renderPanel("gb");

    expect(screen.queryByText(/Compare Nations/i)).toBeNull();
  });

  it.each(PLAYABLE_SLOT_COUNTRY_IDS)("renders %s's full dossier field set", (countryId) => {
    renderPanel(countryId);
    const flavor = NATION_FLAVOR_TEXT[countryId];
    const fields = NATION_DOSSIER_FIELDS[countryId];

    // Economy tab is expanded by default.
    expect(screen.getByText(flavor.economy)).toBeTruthy();
    expect(screen.getByText(new RegExp(fields.budgetCategory))).toBeTruthy();
    expect(screen.getByText(new RegExp(fields.shipbuildingCapacity))).toBeTruthy();
    expect(screen.getByText(new RegExp(fields.researchStrengths))).toBeTruthy();
    expect(screen.getByText(new RegExp(fields.researchWeaknesses))).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Military" }));
    expect(screen.getByText(flavor.military)).toBeTruthy();
    expect(screen.getByText(new RegExp(fields.doctrine))).toBeTruthy();
    expect(screen.getByText(new RegExp(`${fields.difficulty} / 5`))).toBeTruthy();
    expect(screen.getByText(new RegExp(fields.likelyRivals.join(", ")))).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Diplomacy" }));
    expect(screen.getByText(flavor.diplomacy)).toBeTruthy();
    expect(screen.getByText(new RegExp(fields.strategicRegions))).toBeTruthy();
    expect(screen.getByText(new RegExp(fields.nationalCharacteristics))).toBeTruthy();
  });

  it("collapses back to grid focus via Change Nation", () => {
    const { onChangeNation } = renderPanel("gb");

    fireEvent.click(screen.getByRole("button", { name: "Change Nation" }));

    expect(onChangeNation).toHaveBeenCalledTimes(1);
  });

  it("advances the flow with the confirmed nation id via Continue as [Nation]", () => {
    const { onConfirm } = renderPanel("gb");

    fireEvent.click(screen.getByRole("button", { name: "Continue as United Kingdom" }));

    expect(onConfirm).toHaveBeenCalledWith("gb");
  });

  it("applies the Recommended Setup for the confirmed nation id", () => {
    const { onRecommendedSetup } = renderPanel("gb");

    fireEvent.click(screen.getByRole("button", { name: "Recommended Setup" }));

    expect(onRecommendedSetup).toHaveBeenCalledWith("gb");
  });

  it("renders nothing when not open", () => {
    const { container } = render(
      <DossierSlidePanel
        countryId="gb"
        isOpen={false}
        onChangeNation={vi.fn()}
        onConfirm={vi.fn()}
        onRecommendedSetup={vi.fn()}
      />,
    );

    expect(container.innerHTML).toBe("");
  });
});
