import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommentaryLineView } from "@cm-clone/contracts";
import { useStateChangeReread } from "../../../../src/renderer/match/hooks/useStateChangeReread.js";
import type { MatchStream, ReadProjection } from "../../../../src/renderer/match/stream.js";
import { mockPreload, resumeView, rid, session } from "../liveMatchDayHarness.js";

/** Just enough of the stream port for this owner: it only mints stamps and reads the cursor. */
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

const readOf = (): ReadProjection & { readonly polled: ReturnType<typeof vi.fn> } =>
  ({ polled: vi.fn(), commanded: vi.fn() }) as unknown as ReadProjection & {
    readonly polled: ReturnType<typeof vi.fn>;
  };

const line = (tag: string): CommentaryLineView => new CommentaryLineView({ minute: 1, tag, text: "…" });

const match = session().match as never;

const respond = (): void => {
  mockPreload(async () => ({ _tag: "Success", value: resumeView({ isComplete: false }) }) as never);
};

const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe("useStateChangeReread", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("reads once on mount to restore a paused decision, even with nothing revealed", async () => {
    respond();
    const read = readOf();
    renderHook(() =>
      useStateChangeReread({ saveId: rid("s1"), match, lines: [], initialRead: true, stream: streamOf(), read }),
    );
    await waitFor(() => expect(read.polled).toHaveBeenCalledTimes(1));
    expect(read.polled).toHaveBeenCalledWith(expect.anything(), 7);
  });

  it("does nothing while only non-state-changing lines have been revealed", async () => {
    respond();
    const read = readOf();
    renderHook(() =>
      useStateChangeReread({
        saveId: rid("s1"),
        match,
        lines: [line("MatchStarted"), line("Foul")],
        initialRead: false,
        stream: streamOf(),
        read,
      }),
    );
    await flush();
    expect(read.polled).not.toHaveBeenCalled();
  });

  it("reads when a state-changing line is the newest", async () => {
    respond();
    const read = readOf();
    renderHook(() =>
      useStateChangeReread({
        saveId: rid("s1"),
        match,
        lines: [line("Foul"), line("Goal")],
        initialRead: false,
        stream: streamOf(),
        read,
      }),
    );
    await waitFor(() => expect(read.polled).toHaveBeenCalledTimes(1));
  });

  it("re-reads when another state-changing line is appended", async () => {
    respond();
    const read = readOf();
    const stream = streamOf();
    const props = (lines: ReadonlyArray<CommentaryLineView>) => ({
      saveId: rid("s1"),
      match,
      lines,
      initialRead: false,
      stream,
      read,
    });
    const { rerender } = renderHook(({ lines }: { readonly lines: ReadonlyArray<CommentaryLineView> }) => useStateChangeReread(props(lines)), {
      initialProps: { lines: [line("Goal")] as ReadonlyArray<CommentaryLineView> },
    });
    await waitFor(() => expect(read.polled).toHaveBeenCalledTimes(1));

    rerender({ lines: [line("Goal"), line("RedCard")] });
    await waitFor(() => expect(read.polled).toHaveBeenCalledTimes(2));
  });

  it("does not read when there is no match", async () => {
    respond();
    const read = readOf();
    renderHook(() =>
      useStateChangeReread({
        saveId: rid("s1"),
        match: null,
        lines: [line("Goal")],
        initialRead: true,
        stream: streamOf(),
        read,
      }),
    );
    await flush();
    expect(read.polled).not.toHaveBeenCalled();
  });
});
