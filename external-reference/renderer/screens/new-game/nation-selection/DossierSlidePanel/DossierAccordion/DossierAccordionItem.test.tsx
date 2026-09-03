/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { Coins } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { DossierAccordionItem } from "./DossierAccordionItem.js";
import type { DossierSection } from "./types.js";

const section: DossierSection = {
  id: "economy",
  label: "Economy",
  text: "The Admiralty funds ship construction.",
  icon: Coins,
  accent: "gold",
};

function renderItem(state: "expanded" | "collapsed") {
  return render(
    <DossierAccordionItem section={section} state={state} onSelect={vi.fn()} onKeyDown={vi.fn()} />,
  );
}

describe("DossierAccordionItem", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the expanded panel variant with the section text", () => {
    renderItem("expanded");

    const trigger = screen.getByRole("button", { name: "Economy" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("The Admiralty funds ship construction.")).toBeTruthy();
  });

  it("renders the collapsed tab variant without the panel text", () => {
    renderItem("collapsed");

    const trigger = screen.getByRole("button", { name: "Economy" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("The Admiralty funds ship construction.")).toBeNull();
  });
});
