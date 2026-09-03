// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PillarDistribution } from "@cm-clone/shared";
import { CreationStep1 } from "../src/renderer/CreationStep1.js";

const EVEN: PillarDistribution = {
  tacticalAcumen: 3,
  influence: 3,
  regimen: 3,
  technicalCoaching: 3,
};

/** Renders step 1 already switched to the "Manager identity" sub-panel, which is where the pillar
 * allocation lives. The stepper is the only route between sub-panels, and it stays disabled until a
 * save name is present — so a name is required to reach the pillars at all. */
const renderIdentityPanel = async (
  pillars: PillarDistribution,
  onPillarsChange: (next: PillarDistribution) => void,
) => {
  render(
    <CreationStep1
      saveName="My Career"
      managerName=""
      pillars={pillars}
      onSaveNameChange={() => undefined}
      onManagerNameChange={() => undefined}
      onPillarsChange={onPillarsChange}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Manager identity/ }));
  // `AnimatePresence mode="wait"` swaps the sub-panels across a frame, so the pillar controls are
  // not in the tree synchronously after the click.
  await screen.findByRole("button", { name: "Increase Influence" });
};

afterEach(cleanup);

/**
 * The pillar editor was silently inert for a while: it was gated on a `customMode` flag derived
 * from an archetype the retired step-1 picker was the only writer of, so the flag was permanently
 * false and every +/− button stayed disabled. Nothing caught it, because no test drove these
 * controls. These assertions observe the emitted distribution, so they fail if the editor is ever
 * frozen again.
 */
describe("CreationStep1 pillar allocation", () => {
  it("raises a single pillar and leaves its neighbours untouched", async () => {
    const emitted: Array<PillarDistribution> = [];
    await renderIdentityPanel(EVEN, (next) => emitted.push(next));

    fireEvent.click(screen.getByRole("button", { name: "Increase Influence" }));

    expect(emitted).toEqual([{ ...EVEN, influence: 4 }]);
  });

  it("lowers a single pillar", async () => {
    const emitted: Array<PillarDistribution> = [];
    await renderIdentityPanel(EVEN, (next) => emitted.push(next));

    fireEvent.click(screen.getByRole("button", { name: "Decrease Regimen" }));

    expect(emitted).toEqual([{ ...EVEN, regimen: 2 }]);
  });

  it("disables the controls at the ends of the range rather than emitting out-of-range values", async () => {
    const emitted: Array<PillarDistribution> = [];
    await renderIdentityPanel(
      { tacticalAcumen: 5, influence: 1, regimen: 3, technicalCoaching: 3 },
      (next) => emitted.push(next),
    );

    const atMax = screen.getByRole<HTMLButtonElement>("button", { name: "Increase Tactical Acumen" });
    const atMin = screen.getByRole<HTMLButtonElement>("button", { name: "Decrease Influence" });
    expect(atMax.disabled).toBe(true);
    expect(atMin.disabled).toBe(true);

    fireEvent.click(atMax);
    fireEvent.click(atMin);
    expect(emitted).toEqual([]);
  });
});
