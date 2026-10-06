import { SaveNotFoundError, SaveId as SaveIdSchema } from "@cm-clone/contracts";
import { Cause, Schema } from "effect";
import { AsyncResult } from "effect/unstable/reactivity";
import { describe, expect, it } from "vitest";
import { remoteFailure, transportFailure, type RpcClientError } from "../../../src/renderer/rpc/errors.js";
import { readState } from "../../../src/renderer/rpc/readState.js";

/**
 * group-i ticket 08: the one helper the scouting and training screens use to turn a read into
 * loading, failure message or value.
 */

const MESSAGES = { loading: "Loading the board...", failed: "The board could not be loaded." };
type Read = AsyncResult.AsyncResult<{ readonly count: number }, RpcClientError<"getScouting">>;

describe("readState", () => {
  it("an Initial read is loading, with the loading line", () => {
    const read: Read = AsyncResult.initial();
    expect(readState(read, MESSAGES)).toEqual({ _tag: "Loading", message: "Loading the board..." });
  });

  it("a Success read is ready with its value, even while a refresh is waiting", () => {
    const read: Read = AsyncResult.success({ count: 2 }, { waiting: true });
    expect(readState(read, MESSAGES)).toEqual({ _tag: "Ready", value: { count: 2 } });
  });

  it("a typed remote failure shows the error's own sentence", () => {
    const saveId = Schema.decodeSync(SaveIdSchema)("save-1");
    const read: Read = AsyncResult.fail(remoteFailure("getScouting", new SaveNotFoundError({ id: saveId })));
    expect(readState(read, MESSAGES)).toEqual({ _tag: "Failed", message: "That save could not be found." });
  });

  it("a transport failure shows the transport sentence", () => {
    const read: Read = AsyncResult.fail(transportFailure("getScouting", new Error("ipc")));
    expect(readState(read, MESSAGES)).toEqual({
      _tag: "Failed",
      message: "Unable to reach the game. Please try again.",
    });
  });

  it("a defect-only failure carries no typed error, so it falls back to the failed line", () => {
    const read: Read = AsyncResult.failure(Cause.die(new Error("boom")));
    expect(readState(read, MESSAGES)).toEqual({ _tag: "Failed", message: "The board could not be loaded." });
  });
});
