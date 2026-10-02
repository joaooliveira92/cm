import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
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

/** The file in the commentary folder that records which `.cfg` the player chose (cm-style-commentary
 *  09). Plain text, the file name alone; absent means `events.cfg`. */
export const CHOSEN_COMMENTARY_FILE = path.join("commentary", "chosen.txt");

const GAME_FILE_NAME = path.basename(COMMENTARY_FILE);

export const SHIPPED_COMMENTARY: CommentaryTable = parseCommentaryFile(SHIPPED_COMMENTARY_TEXT).table;

/** Opens a file with the operating system; resolves to an error message, or "" on success
 *  (Electron's `shell.openPath` contract). */
export type OpenPath = (file: string) => Promise<string>;

interface Loaded {
  readonly file: string;
  readonly files: ReadonlyArray<string>;
  readonly table: CommentaryTable;
  readonly problems: ReadonlyArray<string>;
}

let cached: (Loaded & { readonly mtimeMs: number }) | null = null;

const commentaryPath = (userDataDir: string): string => path.join(userDataDir, COMMENTARY_FILE);

/** Every `.cfg` in the commentary folder, sorted by name. */
const listFiles = (userDataDir: string): Promise<ReadonlyArray<string>> =>
  readdir(path.dirname(commentaryPath(userDataDir))).then(
    (names) => names.filter((name) => name.toLowerCase().endsWith(".cfg")).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    () => [],
  );

/** The file the game reads: the player's choice while it is still in the folder, else `events.cfg`. */
const activeFile = (userDataDir: string, files: ReadonlyArray<string>): Promise<string> =>
  readFile(path.join(userDataDir, CHOSEN_COMMENTARY_FILE), "utf8").then(
    (chosen) => path.join(path.dirname(commentaryPath(userDataDir)), files.includes(chosen.trim()) ? chosen.trim() : GAME_FILE_NAME),
    () => commentaryPath(userDataDir),
  );

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
    if ((yield* Effect.promise(() => modifiedAt(commentaryPath(userDataDir)))) === null) {
      yield* writeShipped(commentaryPath(userDataDir), false);
    }
    const files = yield* Effect.promise(() => listFiles(userDataDir));
    const file = yield* Effect.promise(() => activeFile(userDataDir, files));
    const mtimeMs = yield* Effect.promise(() => modifiedAt(file));
    if (mtimeMs === null) return { file, files, table: SHIPPED_COMMENTARY, problems: [] };
    if (cached !== null && cached.file === file && cached.mtimeMs === mtimeMs) return { ...cached, files };

    const text = yield* Effect.promise(() => readFile(file, "utf8").catch(() => null));
    if (text === null) return { file, files, table: SHIPPED_COMMENTARY, problems: [] };
    const { table, problems } = parseCommentaryFile(text, SHIPPED_COMMENTARY);
    if (problems.length > 0) yield* Effect.logWarning("commentary file has lines the game skipped", { file, problems });
    cached = { file, files, mtimeMs, table, problems };
    return cached;
  });

/** The commentary table for `userDataDir`'s file: the player's lines over the shipped ones. */
export const loadCommentaryTable = (userDataDir: string): Effect.Effect<CommentaryTable> =>
  loadCommentary(userDataDir).pipe(Effect.map((loaded) => loaded.table));

export const commentaryFileStatus = (userDataDir: string): Effect.Effect<CommentaryFileStatusView> =>
  loadCommentary(userDataDir).pipe(
    Effect.map(
      ({ file, files, problems }) =>
        new CommentaryFileStatusView({ file, files: [...files], active: path.basename(file), problems: [...problems] }),
    ),
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

/** Records `name` as the file the game reads, when it is a `.cfg` in the commentary folder. */
const writeChoice = (userDataDir: string, name: string) =>
  Effect.promise(() =>
    writeFile(path.join(userDataDir, CHOSEN_COMMENTARY_FILE), name, "utf8").then(() => null, (error: unknown) => String(error)),
  ).pipe(
    Effect.flatMap((failure) =>
      failure === null ? Effect.void : Effect.logWarning("commentary file choice could not be saved", { name, failure }),
    ),
  );

/** Makes `name` the file the game reads. A name not in the folder (it was just deleted, say) leaves the
 *  choice as it was. */
export const chooseCommentaryFile = (userDataDir: string, name: string) =>
  Effect.gen(function* () {
    const { files } = yield* commentaryFileStatus(userDataDir);
    if (files.includes(name)) yield* writeChoice(userDataDir, name);
    else yield* Effect.logWarning("commentary file to choose is not in the folder", { name });
    return yield* commentaryFileStatus(userDataDir);
  });

/** Replaces `events.cfg` with the game's own lines and makes it the file the game reads. */
export const resetCommentaryFile = (userDataDir: string) =>
  writeShipped(commentaryPath(userDataDir), true).pipe(
    Effect.andThen(writeChoice(userDataDir, GAME_FILE_NAME)),
    Effect.andThen(commentaryFileStatus(userDataDir)),
  );
