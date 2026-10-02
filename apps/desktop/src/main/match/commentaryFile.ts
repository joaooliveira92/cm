import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Effect } from "effect";
import { CommentaryFileStatusView } from "@cm-clone/contracts";
import { SHIPPED_COMMENTARY_TEXT, parseCommentaryFile, type CommentaryTable } from "@cm-clone/game-engine";

/**
 * The player-editable commentary file, after Championship Manager's `events.cfg`: plain text in the
 * app's user data folder. The game writes its own copy there the first time it is needed, and reads it
 * again whenever its modification time changes, so an edit shows from the next lines of a match in
 * play. A section or setting a player's file lacks takes the shipped file's; nothing in the file can
 * stop a match. Problems are logged once per change of the file, and Preferences lists them.
 */
export const COMMENTARY_FILE = path.join("commentary", "events.cfg");

export const SHIPPED_COMMENTARY: CommentaryTable = parseCommentaryFile(SHIPPED_COMMENTARY_TEXT).table;

/** Opens a file with the operating system; resolves to an error message, or "" on success
 *  (Electron's `shell.openPath` contract). */
export type OpenPath = (file: string) => Promise<string>;

interface Loaded {
  readonly file: string;
  readonly table: CommentaryTable;
  readonly problems: ReadonlyArray<string>;
}

let cached: (Loaded & { readonly mtimeMs: number }) | null = null;

const commentaryPath = (userDataDir: string): string => path.join(userDataDir, COMMENTARY_FILE);

const modifiedAt = (file: string): Promise<number | null> => stat(file).then((info) => info.mtimeMs, () => null);

/** Writes the shipped file to `file`; `overwrite` replaces a player's copy. A failure (read-only folder)
 *  is logged, and the game goes on with the shipped lines. */
const writeShipped = (file: string, overwrite: boolean) =>
  Effect.promise(() =>
    mkdir(path.dirname(file), { recursive: true })
      .then(() => writeFile(file, SHIPPED_COMMENTARY_TEXT, { encoding: "utf8", flag: overwrite ? "w" : "wx" }))
      .then(() => null, (error: unknown) => String(error)),
  ).pipe(
    Effect.flatMap((failure) =>
      failure === null ? Effect.void : Effect.logWarning("commentary file could not be written", { file, failure }),
    ),
  );

/** The player's lines over the shipped ones, and what was skipped. */
const loadCommentary = (userDataDir: string): Effect.Effect<Loaded> =>
  Effect.gen(function* () {
    const file = commentaryPath(userDataDir);
    const mtimeMs = yield* Effect.promise(() => modifiedAt(file));
    if (mtimeMs === null) {
      yield* writeShipped(file, false);
      return { file, table: SHIPPED_COMMENTARY, problems: [] };
    }
    if (cached !== null && cached.file === file && cached.mtimeMs === mtimeMs) return cached;

    const text = yield* Effect.promise(() => readFile(file, "utf8").catch(() => null));
    if (text === null) return { file, table: SHIPPED_COMMENTARY, problems: [] };
    const { table, problems } = parseCommentaryFile(text, SHIPPED_COMMENTARY);
    if (problems.length > 0) yield* Effect.logWarning("commentary file has lines the game skipped", { file, problems });
    cached = { file, mtimeMs, table, problems };
    return cached;
  });

/** The commentary table for `userDataDir`'s file: the player's lines over the shipped ones. */
export const loadCommentaryTable = (userDataDir: string): Effect.Effect<CommentaryTable> =>
  loadCommentary(userDataDir).pipe(Effect.map((loaded) => loaded.table));

export const commentaryFileStatus = (userDataDir: string): Effect.Effect<CommentaryFileStatusView> =>
  loadCommentary(userDataDir).pipe(
    Effect.map(({ file, problems }) => new CommentaryFileStatusView({ file, problems: [...problems] })),
  );

/** Hands the file to the operating system's editor. Without an `openPath` (a test, or no shell) the
 *  request is logged and the status returned as it is. */
export const openCommentaryFile = (userDataDir: string, openPath: OpenPath | undefined) =>
  Effect.gen(function* () {
    const status = yield* commentaryFileStatus(userDataDir);
    if (openPath === undefined) {
      yield* Effect.logWarning("commentary file can't be opened: no shell", { file: status.file });
      return status;
    }
    const failure = yield* Effect.promise(() => openPath(status.file).catch((error: unknown) => String(error)));
    if (failure !== "") yield* Effect.logWarning("commentary file could not be opened", { file: status.file, failure });
    return status;
  });

/** Replaces the player's file with the game's own lines. */
export const resetCommentaryFile = (userDataDir: string) =>
  writeShipped(commentaryPath(userDataDir), true).pipe(Effect.andThen(commentaryFileStatus(userDataDir)));
