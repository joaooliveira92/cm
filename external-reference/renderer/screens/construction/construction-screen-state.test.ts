import { describe, expect, it } from "vite-plus/test";
import { createCompiledDesignVersion } from "@bluewave/campaign-engine";
import {
  acceptCommand,
  applyProjection,
  applyRejection,
  applyTransportFailure,
  beginRequest,
  describeRejection,
  prepareCommand,
} from "../../lib/command-screen-workflow.js";
import type { PreparedCommand, RequestKind } from "../../lib/command-screen-workflow.js";
import type { ConstructionScreenState } from "./construction-screen-state.js";
import {
  acceptConstructionCommand,
  initialConstructionScreenState,
  projectConstructionScreen,
} from "./construction-screen-state.js";

const design = createCompiledDesignVersion("design_majestic", {
  className: "Majestic",
  shipType: "battleship",
  nationId: "nation_uk",
  year: 1894,
  mass: 16000,
  speed: 16,
  machineryType: "coal_vte",
  requiredTechnologyIds: ["tech_steel_hull"],
});

const command = {
  commandId: "cmd_1",
  designId: "design_majestic",
  design,
  nationId: "nation_uk",
  status: "submitted" as const,
  projectedCost: 32000,
  projectedCapacityUnits: 16,
  submittedAtRevision: 0,
};

const workspace = {
  commands: [command],
  movementCommands: [],
  treasuryReserved: 32000,
  capacityReserved: 16,
};

const projection = {
  revision: 0,
  month: { year: 1900, month: 1 },
  economy: {
    treasury: 50000,
    monthlyAppropriation: 5000,
    shipyardCapacity: 50,
  },
  designs: [design],
  projects: [],
  workspace: {
    commands: [],
    movementCommands: [],
    treasuryReserved: 0,
    capacityReserved: 0,
  },
};

function loadedState(): ConstructionScreenState {
  return applyProjection(
    initialConstructionScreenState(),
    projection,
    projectConstructionScreen(projection),
  );
}

function prepared(kind: RequestKind, transportRequestId: string): PreparedCommand<unknown> {
  return {
    kind,
    context: { expectedRevision: 0, transportRequestId },
    send: async () => ({ outcome: "success", value: undefined, diagnostics: [] }),
  };
}

describe("construction screen state", () => {
  it("maps the engine projection domain fields verbatim", () => {
    expect(projectConstructionScreen(projection)).toEqual({
      month: projection.month,
      economy: projection.economy,
      designs: projection.designs,
      workspace: projection.workspace,
    });
  });

  it("adopts the projection revision and clears every request marker", () => {
    const state = loadedState();

    expect(state.revision).toBe(0);
    expect(state.economy?.treasury).toBe(50000);
    expect(state.designs).toEqual([design]);
    expect(state.workspace?.treasuryReserved).toBe(0);
    expect(state.pendingRequest).toBeNull();
    expect(state.requiresRefresh).toBe(false);
    expect(state.notice).toBeNull();
  });

  it("records the in-flight transport request so a retry can reuse its identity", () => {
    const state = beginRequest(loadedState(), prepared("submit", "tx-1"));

    expect(state.pendingRequest).toEqual({
      kind: "submit",
      transportRequestId: "tx-1",
    });
    expect(state.notice).toBeNull();
  });

  it("adopts the engine workspace from an accepted command", () => {
    const { patch, notice } = acceptConstructionCommand({ command, workspace });
    const state = acceptCommand(
      beginRequest(loadedState(), prepared("submit", "tx-1")),
      patch,
      notice,
    );

    expect(state.workspace).toEqual(workspace);
    expect(state.pendingRequest).toBeNull();
    expect(state.notice).toContain("cmd_1");
  });

  it("adopts the engine current revision on a stale rejection instead of retrying", () => {
    const state = applyRejection(beginRequest(loadedState(), prepared("submit", "tx-1")), {
      outcome: "rejected",
      reason: "STALE_REVISION",
      diagnostics: ["STALE_REVISION: Expected revision 0, current revision is 3"],
      currentRevision: 3,
    });

    expect(state.revision).toBe(3);
    expect(state.pendingRequest).toBeNull();
    expect(state.notice).toContain("3");
    expect(state.requiresRefresh).toBe(true);
  });

  it("clears the refresh requirement once a fresh projection arrives", () => {
    const stale = applyRejection(beginRequest(loadedState(), prepared("submit", "tx-1")), {
      outcome: "rejected",
      reason: "STALE_REVISION",
      diagnostics: [],
      currentRevision: 3,
    });

    const refreshed = applyProjection(
      stale,
      { ...projection, revision: 3 },
      projectConstructionScreen({ ...projection, revision: 3 }),
    );

    expect(refreshed.requiresRefresh).toBe(false);
    expect(refreshed.revision).toBe(3);
  });

  it("keeps the previous revision when a rejection carries no revision", () => {
    const state = applyRejection(beginRequest(loadedState(), prepared("cancel", "tx-2")), {
      outcome: "rejected",
      reason: "CANCEL_FAILED",
      diagnostics: ["COMMAND_NOT_FOUND: No command with ID 'cmd_9'"],
    });

    expect(state.revision).toBe(0);
    expect(state.notice).toContain("CANCEL_FAILED");
    expect(state.notice).toContain("cmd_9");
    expect(state.pendingRequest).toBeNull();
    expect(state.requiresRefresh).toBe(false);
  });

  it("keeps the pending request after a transport failure so a retry is safe", () => {
    const state = applyTransportFailure(
      beginRequest(loadedState(), prepared("submit", "tx-3")),
      "timed out",
    );

    expect(state.pendingRequest).toEqual({
      kind: "submit",
      transportRequestId: "tx-3",
    });
    expect(state.notice).toContain("timed out");
  });

  it("describes a rejection from the engine reason and diagnostics only", () => {
    expect(
      describeRejection("VALIDATION_FAILED", [
        "INSUFFICIENT_TREASURY: Need 32000 but only 100 available",
      ]),
    ).toBe("VALIDATION_FAILED: INSUFFICIENT_TREASURY: Need 32000 but only 100 available");
    expect(describeRejection("SESSION_NOT_FOUND", [])).toBe("SESSION_NOT_FOUND");
    expect(describeRejection("STALE_REVISION", [], 4)).toContain("current revision 4");
  });

  it("lists several diagnostics instead of running them into one line", () => {
    expect(
      describeRejection("VALIDATION_FAILED", [
        "INSUFFICIENT_TREASURY: Need 32000 but only 18000 available (32000 reserved by pending commands)",
        "DUPLICATE_COMMAND: A submitted command for design 'design_majestic' already exists",
      ]),
    ).toBe(
      [
        "VALIDATION_FAILED:",
        "• INSUFFICIENT_TREASURY: Need 32000 but only 18000 available (32000 reserved by pending commands)",
        "• DUPLICATE_COMMAND: A submitted command for design 'design_majestic' already exists",
      ].join("\n"),
    );
  });

  it("creates a distinct transport request identity per attempt", () => {
    const send = async () => ({ outcome: "success", value: undefined, diagnostics: [] }) as const;
    const first = prepareCommand("submit", 0, send);
    const second = prepareCommand("submit", 0, send);

    expect(first.context.transportRequestId).not.toBe(second.context.transportRequestId);
    expect(first.context.transportRequestId.startsWith("submit-")).toBe(true);
  });
});
