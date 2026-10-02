import { useEffect, useState } from "react";
import { Effect, Result } from "effect";
import type { CommentaryFileStatusView } from "@cm-clone/contracts";
import { Button } from "../components/ui/button.js";
import { getCommentaryFileStatus, openCommentaryFile, resetCommentaryFile } from "../rpc.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";

type FileMethod = "getCommentaryFileStatus" | "openCommentaryFile" | "resetCommentaryFile";

/**
 * Preferences' Commentary section: where the player-editable commentary file is, buttons to open it
 * or put the game's lines back, and the lines the game skipped in it. After Championship Manager's
 * `events.cfg`, which players edited by hand.
 */
export const CommentaryFileSection = () => {
  const [status, setStatus] = useState<CommentaryFileStatusView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const run = (request: Effect.Effect<CommentaryFileStatusView, RpcClientError<FileMethod>>): void => {
    void Effect.runPromise(request.pipe(Effect.result)).then((outcome) => {
      if (Result.isFailure(outcome)) {
        setError(describeRpcError(outcome.failure));
        return;
      }
      setError(null);
      setStatus(outcome.success);
    });
  };

  useEffect(() => run(getCommentaryFileStatus), []);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label text-text-secondary">Commentary</legend>
      <p className="text-data text-text-soft">
        Every line the commentator says comes from this file. Edit it in any text editor; changes show
        from the next lines of a match.
      </p>
      {status !== null && <p className="break-all font-mono text-data text-text-secondary">{status.file}</p>}
      {error !== null && <p className="text-data text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={status === null} onClick={() => run(openCommentaryFile)}>
          Open commentary file
        </Button>
        {confirmingReset ? (
          <>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmingReset(false);
                run(resetCommentaryFile);
              }}
            >
              Reset, losing my edits
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmingReset(false)}>
              Keep my edits
            </Button>
          </>
        ) : (
          <Button type="button" variant="ghost" disabled={status === null} onClick={() => setConfirmingReset(true)}>
            Reset to the game's lines
          </Button>
        )}
      </div>
      {status !== null && status.problems.length > 0 && (
        <section aria-label="Problems in the commentary file" className="flex flex-col gap-1">
          <p className="text-data text-text-warning">
            The game skipped {status.problems.length === 1 ? "1 problem" : `${status.problems.length} problems`} in
            the file and used its own lines there:
          </p>
          <ul className="max-h-32 overflow-y-auto rounded-control border border-border-subtle p-2 font-mono text-data text-text-soft">
            {status.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </section>
      )}
    </fieldset>
  );
};
