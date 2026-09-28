import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  APPEARANCE_STORAGE_KEY,
  applyAppearance,
  DEFAULT_APPEARANCE,
  loadAppearance,
  saveAppearance,
} from "../../../src/renderer/appearance/appearance.js";
import { PreferencesDialog } from "../../../src/renderer/appearance/PreferencesDialog.js";

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.baseColor;
  delete document.documentElement.dataset.themeColor;
});

afterEach(cleanup);

describe("appearance persistence", () => {
  it("defaults to Neutral on both axes on first launch", () => {
    expect(loadAppearance()).toEqual({ baseColor: "neutral", themeColor: "neutral" });
  });

  it("round-trips a saved choice", () => {
    saveAppearance({ baseColor: "stone", themeColor: "rose" });
    expect(loadAppearance()).toEqual({ baseColor: "stone", themeColor: "rose" });
  });

  it("reconciles each axis on its own, so one bad value keeps the other", () => {
    window.localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ baseColor: "slate", themeColor: "blue" }),
    );
    expect(loadAppearance()).toEqual({ baseColor: "neutral", themeColor: "blue" });
  });

  it("reads corrupt storage as the default", () => {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, "{not json");
    expect(loadAppearance()).toEqual(DEFAULT_APPEARANCE);
  });

  it("writes the pair onto the root element", () => {
    applyAppearance({ baseColor: "zinc", themeColor: "green" });
    expect(document.documentElement.dataset.baseColor).toBe("zinc");
    expect(document.documentElement.dataset.themeColor).toBe("green");
  });
});

describe("PreferencesDialog", () => {
  it("applies and persists a choice the moment it is made", () => {
    render(<PreferencesDialog onClose={() => {}} />);
    const baseGroup = screen.getByRole("group", { name: "Base color" });
    const themeGroup = screen.getByRole("group", { name: "Theme color" });
    expect(
      (baseGroup.querySelector("input[value=neutral]") as HTMLInputElement).checked,
    ).toBe(true);

    fireEvent.click(screen.getByRole("radio", { name: "Violet" }));

    expect(themeGroup.querySelector<HTMLInputElement>("input:checked")?.value).toBe("violet");
    expect(document.documentElement.dataset.themeColor).toBe("violet");
    expect(loadAppearance()).toEqual({ baseColor: "neutral", themeColor: "violet" });
  });

  it("closes on Done", () => {
    let closed = false;
    render(<PreferencesDialog onClose={() => (closed = true)} />);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(closed).toBe(true);
  });
});
