import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Effect } from "effect";
import { SHIPPED_COMMENTARY_TEXT, parseCommentaryFile, type CommentaryTable } from "@cm-clone/game-engine";

/**
 * The player-editable commentary file, after Championship Manager's `events.cfg`: plain text in the
 * app's user data folder. The game writes its own copy there the first time a match is read, and reads
 * it again whenever its modification time changes, so an edit shows from the next lines of a match in
 * play. A section or setting a player's file lacks takes the shipped file's; nothing in the file can
 * stop a match. Problems are logged once per change of the file.
 */
export const COMMENTARY_FILE = path.join("commentary", "events.cfg");

export const SHIPPED_COMMENTARY: CommentaryTable = parseCommentaryFile(SHIPPED_COMMENTARY_TEXT).table;

interface Cached {
  readonly file: string;
  readonly mtimeMs: number;
  readonly table: CommentaryTable;
}

let cached: Cached | null = null;

const modifiedAt = (file: string): Promise<number | null> => stat(file).then((info) => info.mtimeMs, () => null);

/** Writes the shipped file where the player can find it. A failure (read-only folder) is logged and
 *  the match goes on with the shipped lines. */
const seed = (file: string) =>
  Effect.promise(() =>
    mkdir(path.dirname(file), { recursive: true })
      .then(() => writeFile(file, SHIPPED_COMMENTARY_TEXT, { encoding: "utf8", flag: "wx" }))
      .then(() => null, (error: unknown) => String(error)),
  ).pipe(
    Effect.flatMap((failure) =>
      failure === null ? Effect.void : Effect.logWarning("commentary file could not be written", { file, failure }),
    ),
  );

/** The commentary table for `userDataDir`'s file: the player's lines over the shipped ones. */
export const loadCommentaryTable = (userDataDir: string): Effect.Effect<CommentaryTable> =>
  Effect.gen(function* () {
    const file = path.join(userDataDir, COMMENTARY_FILE);
    const mtimeMs = yield* Effect.promise(() => modifiedAt(file));
    if (mtimeMs === null) {
      yield* seed(file);
      return SHIPPED_COMMENTARY;
    }
    if (cached !== null && cached.file === file && cached.mtimeMs === mtimeMs) return cached.table;

    const text = yield* Effect.promise(() => readFile(file, "utf8").catch(() => null));
    if (text === null) return SHIPPED_COMMENTARY;
    const { table, problems } = parseCommentaryFile(text, SHIPPED_COMMENTARY);
    if (problems.length > 0) yield* Effect.logWarning("commentary file has lines the game skipped", { file, problems });
    cached = { file, mtimeMs, table };
    return table;
  });
