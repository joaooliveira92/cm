// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { PillarDistribution } from "@cm-clone/shared";
import { CreateSessionContext } from "../../../src/renderer/router/createSessionContext.js";
import type { CreationSession, CreateSessionApi, ManagerSubStep } from "../../../src/renderer/router/createSessionContext.js";
import { ManagerIdentityStep } from "../../../src/renderer/create/ManagerIdentityStep.js";

const BASE_SESSION: CreationSession = {
  leagueSelection: null,
  saveName: "My Career",
  managerName: "",
  archetype: "professor",
  pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
  managerStep: 1,
  generation: { _tag: "Idle" },
  clubSelection: null,
  commit: "idle",
  error: null,
};

const EVEN: PillarDistribution = {
  tacticalAcumen: 3,
  influence: 3,
  regimen: 3,
  technicalCoaching: 3,
};

const renderIdentityPanel = async (
  pillars: PillarDistribution,
  onPillarsChange: (next: PillarDistribution) => void,
) => {
  const Harness = () => {
    const [session, setSession] = useState<CreationSession>({
      ...BASE_SESSION,
      pillars,
      managerStep: 1 as ManagerSubStep,
    });
    const api: CreateSessionApi = {
      session,
      update: (patch) => {
        setSession((prev) => {
          const next = { ...prev, ...patch };
          if (patch.pillars !== undefined) {
            onPillarsChange(patch.pillars);
          }
          return next;
        });
      },
      setManagerStep: (step) => {
        setSession((prev) => ({ ...prev, managerStep: step }));
      },
      retryGeneration: () => undefined,
      selectClub: () => undefined,
      registerBottomBar: () => undefined,
      requestLeave: () => undefined,
    };
    return (
      <CreateSessionContext value={api}>
        <ManagerIdentityStep />
      </CreateSessionContext>
    );
  };
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: /Manager identity/ }));
  await screen.findByRole("button", { name: "Increase Influence" });
};

afterEach(cleanup);

describe("ManagerIdentityStep pillar allocation", () => {
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