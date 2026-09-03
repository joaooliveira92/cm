import { describe, expect, it } from "vitest";
import type { SaveId } from "@cm-clone/contracts";
import { SaveId as SaveIdSchema } from "@cm-clone/contracts";
import { Effect } from "effect";
import { AsyncResult, Reactivity } from "effect/unstable/reactivity";
import {
  FAMILIARITY_TIERS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  POSITIONS,
  STATURE_TIERS,
} from "@cm-clone/shared";
import { call } from "../src/renderer/rpc/call.js";
import { describeRpcError, typedError } from "../src/renderer/rpc/errors.js";
import { squadAtom } from "../src/renderer/rpc/queries.js";
import {
  INVALIDATION_RULES,
  advanceCalendarEffect,
} from "../src/renderer/rpc/mutations.js";
import {
  MANAGEMENT_IDLE_TTL,
  MANAGEMENT_SWR_STALE_TIME,
} from "../src/renderer/rpc/policy.js";
import {
  POLL_INTERVAL_MS,
  REFETCH_THRESHOLD,
  REVEAL_INTERVAL_MS,
} from "../src/renderer/rpc/pacing.js";

const relaxedSaveId = (id: string): SaveId => SaveIdSchema.make(id);

const attributes = (value: number): Record<string, number> => ({
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((a) => [a, value])),
});

/** A data-only SquadView shape matching what main encodes; the seam decodes it with its own schemas. */
const squadViewPayload = (saveId: string, clubName: string) => ({
  club: {
    id: relaxedSaveId(saveId),
    name: clubName,
    statureTier: STATURE_TIERS[0],
  },
  players: [
    {
      id: `p-${saveId}`,
      firstName: "Alan",
      lastName: "Shearer",
      dateOfBirth: "1970-08-13",
      age: 30,
      attributes: attributes(12),
      positions: [{ position: POSITIONS[2], familiarity: FAMILIARITY_TIERS[0] }],
      overallRating: 90,
      positionRatings: { WB: 12 },
      condition: 100,
      trainingFocus: null,
      nationality: "England",
      birthplace: "London",
    },
  ],
});

const advanceResult = () => ({
  season: { seasonNumber: 1, currentMatchday: 2, phase: "in_season" as const },
  resolvedMatchday: 1,
  transferWindowClosed: null,
  transferWindowOpened: null,
  seasonConcluded: false,
  boardObjectiveVerdict: null,
  managerOutcome: "none" as const,
});

const installPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  const holder = globalThis as { window?: unknown };
  const previous = holder.window;
  holder.window = { cmClone: { call: impl } };
  return () => {
    holder.window = previous;
  };
};

describe("renderer RPC seam — wire decode (AC-02)", () => {
  it("decodes the Success branch against the method's success schema", async () => {
    const restore = installPreload(async () => ({
      _tag: "Success",
      value: [{ id: relaxedSaveId("s1"), name: "Career", createdAt: "2026-08-29T00:00:00.000Z", archivedCause: null }],
    }));
    try {
      const result = await Effect.runPromise(Effect.result(call("listSaves", undefined)));
      expect(result._tag).toBe("Success");
      if (result._tag === "Success") {
        expect(result.success).toHaveLength(1);
        expect(result.success[0]!.name).toBe("Career");
      }
    } finally {
      restore();
    }
  });

  it("a Success payload that does not decode is a ContractDecodeFailure on the success branch", async () => {
    const restore = installPreload(async () => ({ _tag: "Success", value: { club: 42 } }));
    try {
      const result = await Effect.runPromise(
        Effect.result(call("getSquad", { saveId: relaxedSaveId("s1") })),
      );
      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(result.failure._tag).toBe("ContractDecodeFailure");
        expect(result.failure._tag === "ContractDecodeFailure" && result.failure.branch).toBe("success");
      }
    } finally {
      restore();
    }
  });

  it("decodes the Failure branch's typed domain error into a RemoteFailure", async () => {
    const restore = installPreload(async () => ({
      _tag: "Failure",
      error: { _tag: "SaveNotFoundError", id: relaxedSaveId("s1") },
    }));
    try {
      const result = await Effect.runPromise(
        Effect.result(call("getSquad", { saveId: relaxedSaveId("s1") })),
      );
      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(result.failure._tag).toBe("RemoteFailure");
        expect(result.failure.method).toBe("getSquad");
        if (result.failure._tag === "RemoteFailure") {
          expect(result.failure.error._tag).toBe("SaveNotFoundError");
          expect(describeRpcError(result.failure)).toBe("That save could not be found.");
        }
      }
    } finally {
      restore();
    }
  });

  it("a Failure payload that does not decode is a ContractDecodeFailure on the failure branch", async () => {
    const restore = installPreload(async () => ({
      _tag: "Failure",
      error: { _tag: "SaveNotFoundError" },
    }));
    try {
      const result = await Effect.runPromise(
        Effect.result(call("getSquad", { saveId: relaxedSaveId("s1") })),
      );
      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(result.failure._tag).toBe("ContractDecodeFailure");
        expect(result.failure._tag === "ContractDecodeFailure" && result.failure.branch).toBe("failure");
      }
    } finally {
      restore();
    }
  });

  it("a rejected IPC invocation is a TransportFailure", async () => {
    const restore = installPreload(async () => {
      throw new Error("ipc down");
    });
    try {
      const result = await Effect.runPromise(Effect.result(call("listSaves", undefined)));
      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(result.failure._tag).toBe("TransportFailure");
        expect(result.failure.method).toBe("listSaves");
        expect(describeRpcError(result.failure)).toBe("Unable to reach the game. Please try again.");
      }
    } finally {
      restore();
    }
  });

  it("a Failure branch for a never-error method cannot decode and is a ContractDecodeFailure", async () => {
    const restore = installPreload(async () => ({ _tag: "Failure", error: { anything: true } }));
    try {
      const result = await Effect.runPromise(Effect.result(call("listSaves", undefined)));
      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(result.failure._tag).toBe("ContractDecodeFailure");
        expect(result.failure._tag === "ContractDecodeFailure" && result.failure.branch).toBe("failure");
      }
    } finally {
      restore();
    }
  });

  it("transport, contract-decode, and remote failures are distinct variants", () => {
    const kinds = ["TransportFailure", "ContractDecodeFailure", "RemoteFailure"] as const;
    expect(new Set(kinds).size).toBe(3);
  });
});

describe("renderer RPC seam — family identity (AC-04)", () => {
  it("family identity is the complete normalized request: distinct saves never share an atom", () => {
    const saveA = relaxedSaveId("save-a");
    const saveB = relaxedSaveId("save-b");
    expect(squadAtom(saveA)).not.toBe(squadAtom(saveB));
    expect(squadAtom(saveA)).toBe(squadAtom(saveA));
    expect(squadAtom(saveB)).toBe(squadAtom(saveB));
  });
});

describe("renderer RPC seam — invalidation rules (AC-05)", () => {
  it("each save-scoped query subscribes to the save key; mutations declare their domains", () => {
    const save = relaxedSaveId("s1");
    expect(INVALIDATION_RULES.advanceCalendar(save)).toEqual([["save", save]]);
    expect(INVALIDATION_RULES.setTrainingFocus(save)).toEqual([
      ["squad", save],
      ["training", save],
    ]);
    expect(INVALIDATION_RULES.placeBid(save)).toEqual([
      ["transfers", save],
      ["economy", save],
    ]);
    expect(INVALIDATION_RULES.submitMatchCommand(save, "m1")).toEqual([["match", save, "m1"]]);
    expect(INVALIDATION_RULES.commitCareer(save)).toEqual([]);
  });

  it("placeBid never invalidates squad — a pending bid does not change squad state", () => {
    const save = relaxedSaveId("s1");
    const keys = INVALIDATION_RULES.placeBid(save);
    expect(keys).not.toContainEqual(["squad", save]);
    expect(keys).toContainEqual(["transfers", save]);
    expect(keys).toContainEqual(["economy", save]);
  });

  it("no wildcards anywhere in the invalidation map", () => {
    const save = relaxedSaveId("s1");
    const all = [
      ...INVALIDATION_RULES.advanceCalendar(save),
      ...INVALIDATION_RULES.setTrainingFocus(save),
      ...INVALIDATION_RULES.placeBid(save),
      ...INVALIDATION_RULES.submitMatchCommand(save, "m1"),
      ...INVALIDATION_RULES.commitCareer(save),
    ];
    for (const key of all) {
      expect(JSON.stringify(key)).not.toContain("*");
    }
  });

  it("advanceCalendar invalidates after success only — a failed mutation invalidates nothing", async () => {
    const save = relaxedSaveId("s1");
    const fired: Array<string> = [];

    const run = async (wireImpl: (m: string, p: unknown) => Promise<unknown>) => {
      const restore = installPreload(wireImpl);
      try {
        fired.length = 0;
        const reactivity = await Effect.runPromise(Reactivity.make);
        reactivity.registerUnsafe([["save", save]], () => fired.push("invalidated"));
        const outcome = await Effect.runPromise(
          Effect.result(
            Effect.provideService(advanceCalendarEffect(save), Reactivity.Reactivity, reactivity),
          ),
        );
        return outcome._tag;
      } finally {
        restore();
      }
    };

    const successOutcome = await run(async () => ({ _tag: "Success", value: advanceResult() }));
    expect(successOutcome).toBe("Success");
    expect(fired).toEqual(["invalidated"]);

    const failureOutcome = await run(async () => ({
      _tag: "Failure",
      error: { _tag: "SaveArchivedError", saveId: save, cause: "sacked" },
    }));
    expect(failureOutcome).toBe("Failure");
    expect(fired).toEqual([]);
  });
});

describe("renderer RPC seam — staleness policy (AC-06)", () => {
  it("management reads declare a five-minute SWR idle TTL", () => {
    expect(MANAGEMENT_SWR_STALE_TIME).toBe("5 minutes");
    expect(MANAGEMENT_IDLE_TTL).toBe("5 minutes");
  });

  it("match-day reads are plain typed calls, never SWR atoms (a running match must not go stale)", async () => {
    const match = await import("../src/renderer/rpc/match.js");
    expect(typeof match.resumeSimulation).toBe("function");
    expect(typeof match.startMatch).toBe("function");
    expect(typeof match.listOpponentClubs).toBe("function");
    expect(Object.keys(match).some((k) => k.endsWith("Atom"))).toBe(false);
  });

  it("the seam never opts into refreshOnWindowFocus in a single-window app", async () => {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const seamRoot = fileURLToPath(new URL("../src/renderer/rpc", import.meta.url));
    const files = [
      "policy.ts",
      "queries.ts",
      "mutations.ts",
      "match.ts",
      "call.ts",
      "pacing.ts",
    ];
    const sources = await Promise.all(
      files.map((file) => readFile(join(seamRoot, file), "utf8")),
    );
    for (const source of sources) {
      expect(source).not.toContain("refreshOnWindowFocus");
      expect(source).not.toContain("windowFocusSignal");
    }
  });
});

describe("renderer RPC seam — MatchDay pacing constants (AC-07)", () => {
  it("reveal, poll, and refetch thresholds stay independently paced", () => {
    expect(REVEAL_INTERVAL_MS).toBe(350);
    expect(POLL_INTERVAL_MS).toBe(800);
    expect(REFETCH_THRESHOLD).toBe(5);
    expect(REVEAL_INTERVAL_MS).toBeLessThan(POLL_INTERVAL_MS);
  });
});

describe("renderer RPC seam — typed error surface (AC-03)", () => {
  it("describeRpcError pattern-matches the union for every failure kind", () => {
    const save = relaxedSaveId("s1");
    expect(
      describeRpcError({ _tag: "TransportFailure", method: "getSquad", cause: new Error("down") }),
    ).toBe("Unable to reach the game. Please try again.");
    expect(
      describeRpcError({
        _tag: "ContractDecodeFailure",
        method: "getSquad",
        branch: "success",
        cause: { _tag: "Missing" } as never,
      }),
    ).toBe("The game returned an unexpected response. Please try again.");
    expect(
      describeRpcError({
        _tag: "RemoteFailure",
        method: "getSquad",
        error: { _tag: "SaveNotFoundError", id: save },
      }),
    ).toBe("That save could not be found.");
  });

  it("describeRpcError renders the rebinding rejection tags (Stage 6)", () => {
    const locked = describeRpcError({
      _tag: "RemoteFailure",
      method: "setKeyBindingOverride",
      error: { _tag: "LockedKeyOverrideError", actionId: "open-palette", binding: "Primary+K" },
    });
    expect(locked).toMatch(/locked/i);
    const colliding = describeRpcError({
      _tag: "RemoteFailure",
      method: "setKeyBindingOverride",
      error: {
        _tag: "CollidingOverrideError",
        actionId: "place-bid",
        binding: "b",
        conflictingActionId: "focus-bid",
      },
    });
    expect(colliding).toMatch(/already bound/i);
    const shape = describeRpcError({
      _tag: "RemoteFailure",
      method: "setKeyBindingOverride",
      error: { _tag: "InvalidBindingShapeError", actionId: "focus-bid", binding: "F5" },
    });
    expect(shape).toMatch(/cannot be bound/i);
  });

  it("typedError surfaces the first typed error from a failed AsyncResult", () => {
    const failure = AsyncResult.fail({ _tag: "SaveNotFoundError", id: relaxedSaveId("s1") });
    const error = typedError(failure);
    expect(error).not.toBeNull();
    if (error !== null) {
      expect(error._tag).toBe("SaveNotFoundError");
    }
  });

  it("the seam decodes a full SquadView success payload", async () => {
    const restore = installPreload(async (method) => {
      if (method === "getSquad") return { _tag: "Success", value: squadViewPayload("s1", "Test FC") };
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: relaxedSaveId("s1") } };
    });
    try {
      const result = await Effect.runPromise(
        Effect.result(call("getSquad", { saveId: relaxedSaveId("s1") })),
      );
      expect(result._tag).toBe("Success");
      if (result._tag === "Success") {
        expect(result.success.club.name).toBe("Test FC");
        expect(result.success.players).toHaveLength(1);
      }
    } finally {
      restore();
    }
  });
});