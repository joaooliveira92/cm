import type { ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegistryProvider } from "../../../../src/renderer/rpc.js";
import { useCommentaryCommands, type CommentaryCommands } from "../../../../src/renderer/match/hooks/useCommentaryCommands.js";
import type { InjuryLedger } from "../../../../src/renderer/match/hooks/useInjuryLedger.js";
import type { CommandStatus } from "../../../../src/renderer/match/commandStatus.js";
import type { MatchStream, ReadProjection } from "../../../../src/renderer/match/stream.js";
import { commandView, mockPreload, NOT_FOUND, rid, session } from "../liveMatchDayHarness.js";

const wrapper = ({ children }: { readonly children: ReactNode }) => <RegistryProvider>{children}</RegistryProvider>;

/** The stream cells the command lifecycle touches, all observable. */
const streamOf = (): MatchStream =>
  ({
    stamp: vi.fn(() => 7),
    cursor: vi.fn(() => 0),
    mayPoll: vi.fn(() => false),
    beginFetch: vi.fn(),
    endFetch: vi.fn(),
    endStream: vi.fn(),
    streamEnded: vi.fn(() => false),
    receive: vi.fn(),
    take: vi.fn(() => undefined),
    buffered: vi.fn(() => 0),
    halted: vi.fn(() => false),
    halt: vi.fn(),
    beginCommand: vi.fn(),
    endCommand: vi.fn(),
    playing: vi.fn(() => null),
    setPlaying: vi.fn(),
    reveal: vi.fn(),
    rewindTo: vi.fn(),
  }) as unknown as MatchStream;

const readOf = (): ReadProjection => ({ polled: vi.fn(), commanded: vi.fn() }) as unknown as ReadProjection;

const ledgerOf = (pending: ReadonlyArray<unknown> = []): Pick<InjuryLedger, "pending" | "resolve"> =>
  ({ pending: vi.fn(() => pending), resolve: vi.fn() }) as unknown as Pick<InjuryLedger, "pending" | "resolve">;

const match = session().match as never;
const COMMAND = { _tag: "ChangeTactics", clubId: rid("home") } as never;

const mount = (
  overrides: {
    readonly match?: unknown;
    readonly ledger?: Pick<InjuryLedger, "pending" | "resolve">;
    readonly stream?: MatchStream;
    readonly read?: ReadProjection;
  } = {},
) => {
  const stream = overrides.stream ?? streamOf();
  const read = overrides.read ?? readOf();
  const ledger = overrides.ledger ?? ledgerOf();
  // `null` is a meaningful match here (no match in play), so it cannot go through `??`.
  const matchValue = "match" in overrides ? (overrides.match as never) : match;
  const view = renderHook(
    (): CommentaryCommands =>
      useCommentaryCommands({
        saveId: rid("s1"),
        match: matchValue,
        minute: () => 30,
        ledger,
        stream,
        read,
      }),
    { wrapper },
  );
  return { ...view, stream, read, ledger };
};

const submit = async (commands: CommentaryCommands): Promise<CommandStatus> => {
  let status: CommandStatus | undefined;
  await act(async () => {
    status = await commands.submitCommand(COMMAND, false);
  });
  return status!;
};

describe("useCommentaryCommands", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("resolves the status and drives the stream through the whole command", async () => {
    mockPreload(async () => ({ _tag: "Success", value: commandView(null) }) as never);
    const actedOn = [{ marker: "pending" }];
    const ledger = ledgerOf(actedOn);
    const { result, stream, read } = mount({ ledger });

    const status = await submit(result.current);

    expect(status).toEqual({ _tag: "accepted" });
    expect(stream.beginCommand).toHaveBeenCalledWith(7);
    expect(ledger.resolve).toHaveBeenCalledWith(actedOn);
    expect(read.commanded).toHaveBeenCalledWith(expect.anything(), 7);
    expect(stream.setPlaying).toHaveBeenCalledWith(null);
    expect(stream.endCommand).toHaveBeenCalledTimes(1);
    expect(stream.rewindTo).toHaveBeenCalledWith(0);
  });

  it("reports a remote failure as rejected and still releases the stream", async () => {
    mockPreload(async () => ({ _tag: "Failure", error: NOT_FOUND }) as never);
    const { result, stream } = mount();

    const status = await submit(result.current);

    expect(status).toEqual({ _tag: "rejected", reason: "That save could not be found." });
    expect(stream.endCommand).toHaveBeenCalledTimes(1);
  });

  it("reports a transport throw as rejected rather than rejecting the promise", async () => {
    mockPreload(async () => {
      throw new Error("boom");
    });
    const { result, stream } = mount();

    const status = await submit(result.current);

    expect(status).toEqual({ _tag: "rejected", reason: "Unable to reach the game. Please try again." });
    expect(stream.endCommand).toHaveBeenCalledTimes(1);
  });

  it("rejects without touching the stream when no match is in play", async () => {
    const { result, stream } = mount({ match: null });

    const status = await submit(result.current);

    expect(status).toEqual({ _tag: "rejected", reason: "No match is in play." });
    expect(stream.beginCommand).not.toHaveBeenCalled();
  });
});
