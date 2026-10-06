import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubId, SaveId } from "@cm-clone/contracts";
import { POLL_INTERVAL_MS, RegistryProvider } from "../../../src/renderer/rpc.js";
import { MatchProvider, useMatchContext } from "../../../src/renderer/match/MatchProvider.js";
import { CommentaryProvider } from "../../../src/renderer/match/CommentaryProvider.js";
import { useMatchStreaming } from "../../../src/renderer/match/streaming.js";
import { clearActiveMatch, setActiveMatch } from "../../../src/renderer/match/session.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";

const rid = (id: string) => SaveId.make(id);
const cid = (id: string) => ClubId.make(id);

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const session = {
  saveId: rid("s1"),
  match: {
    matchId: rid("m1"),
    homeClubId: cid("home"),
    homeClubName: "Home FC",
    awayClubId: cid("away"),
    awayClubName: "Away FC",
  },
  phase: "live" as const,
};

/** A host that runs the extracted streaming hook and reads the provider state it feeds. */
const Probe = () => {
  useMatchStreaming();
  const { state } = useMatchContext();
  return <output data-testid="error">{state.error ?? ""}</output>;
};

/** The number of `resumeSimulation` reads the hook has issued so far. */
let reads = 0;

const mountFailingResume = async (): Promise<void> => {
  reads = 0;
  setActiveMatch(session as never);
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) => {
      if (method === "resumeSimulation") reads += 1;
      return { _tag: "Failure", error: NOT_FOUND };
    },
  };
  render(
    <RegistryProvider>
      <MatchProvider saveId={rid("s1")}>
        <CommentaryProvider>
          <Probe />
        </CommentaryProvider>
      </MatchProvider>
    </RegistryProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
};

describe("useMatchStreaming — a failed poll", () => {
  beforeEach(() => {
    resetScopeState();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    clearActiveMatch(rid("s1"));
    resetScopeState();
    vi.useRealTimers();
  });

  it("reports the failure and stops reading further", async () => {
    await mountFailingResume();

    expect(screen.getByTestId("error").textContent).toBe("Failed to resume match simulation");
    expect(reads).toBe(1);

    // The pacer keeps ticking, but `endStream` marked the stream complete, so no further read goes out.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    });
    expect(reads).toBe(1);
  });
});
