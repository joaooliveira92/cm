/**
 * What happens between the player confirming a quit and the process taking it.
 *
 * Lives outside `index.ts` so it can be tested against a real save file. The guarantee this ticket
 * asked for — "discarding removes the provisional world rather than orphaning it on disk" — is not
 * one a renderer test can make, because the renderer's part ends at naming the id. This is the
 * half that does the deleting, and the half worth proving.
 */
import path from "node:path";
import { SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { discardCareer } from "./world/index.js";

/**
 * Delete the provisional career the player agreed to lose, then quit.
 *
 * The delete happens here rather than in the renderer because main owns the exit: a renderer-side
 * `discardCareer` is an in-flight call racing `app.quit()`, and losing that race leaves behind the
 * exact world the dialog promised to remove.
 *
 * `quit` runs either way. A player who asked to leave must leave, so a delete that fails costs a
 * stranded file rather than a stuck application — and `discardCareer` is idempotent, so nothing
 * stops a later pass from cleaning it up. Failing closed here would be the worse trade: an app
 * that will not quit because it could not delete something is an app the player has to kill.
 */
export const confirmQuit = async (
  userDataDir: string,
  discardSaveId: string | null,
  quit: () => void,
): Promise<void> => {
  if (discardSaveId === null) {
    quit();
    return;
  }

  const savesDir = path.join(userDataDir, "saves");
  try {
    await Effect.runPromise(discardCareer(savesDir, SaveId.make(discardSaveId)));
  } finally {
    quit();
  }
};
