import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Context, Effect } from "effect";
import { CommentaryFileError, CommentaryFileStatusView } from "@cm-clone/contracts";
import {
  SHIPPED_COMMENTARY_TEXT,
  missingCommentarySections,
  parseCommentaryFile,
  upgradeCommentaryFile,
  type CommentaryTable,
} from "@cm-clone/game-engine";
import { compareCodeUnits } from "@cm-clone/shared";

/**
 * The player-editable commentary file, after Championship Manager's `events.cfg`: plain text in the
 * app's user data folder. The game writes its own copy there the first time it is needed, and reads it
 * again whenever its modification time changes, so an edit shows from the next lines of a match in
 * play. A section or setting a player's file lacks takes the shipped file's.
 *
 * Reading never fails. Nothing in or around the file can stop a match, so a read problem is logged
 * and the game falls back to the shipped lines. The Preferences commands (open, choose, update,
 * reset) fail with a `CommentaryFileError` instead, so the player learns their change didn't happen.
 * No path leaves this module for the renderer; the status names files.
 */
export const COMMENTARY_FILE = path.join("commentary", "events.cfg");

/** Records which `.cfg` the player chose, by file name alone. Without it the game reads `events.cfg`. */
export const CHOSEN_COMMENTARY_FILE = path.join("commentary", "chosen.txt");

const GAME_FILE_NAME = path.basename(COMMENTARY_FILE);

const SHIPPED_PARSE = parseCommentaryFile(SHIPPED_COMMENTARY_TEXT);
export const SHIPPED_COMMENTARY: CommentaryTable = SHIPPED_PARSE.table;

/**
 * Where a match read gets its commentary table. Defaults to the shipped file, so a test or any caller
 * that doesn't care reads the game's own lines; the RPC handlers provide the player's file from the
 * user data folder (`loadCommentaryTable`).
 */
export const CommentaryTableSource = Context.Reference<Effect.Effect<CommentaryTable>>(
  "cm-clone/main/match/CommentaryTableSource",
  { defaultValue: () => Effect.succeed(SHIPPED_COMMENTARY) },
);

/** Opens a file or folder with the operating system; resolves to an error message, or "" on success
 *  (Electron's `shell.openPath` contract). */
export type OpenPath = (target: string) => Promise<string>;

interface Loaded {
  /** The file the game reads, as a path. It never leaves main. */
  readonly file: string;
  readonly files: ReadonlyArray<string>;
  readonly table: CommentaryTable;
  readonly problems: ReadonlyArray<string>;
  /** Sections the game ships that an older file lacks; empty for a file at the game's version. */
  readonly newSections: ReadonlyArray<string>;
}

/**
 * The last parse of each commentary file, by path. A match reads its commentary on every chunk, about
 * once a second, and the file rarely changes, so it is parsed again only when its modification time
 * does. Keyed by path, so two user data folders, such as two test runs, never see each other's entries.
 */
const parsed = new Map<string, Loaded & { readonly mtimeMs: number }>();

const commentaryPath = (userDataDir: string): string => path.join(userDataDir, COMMENTARY_FILE);
const commentaryFolder = (userDataDir: string): string => path.dirname(commentaryPath(userDataDir));

/** A system error's code (`EACCES`, …): the only part of it that may reach the renderer. */
const errorCode = (error: unknown): string =>
  typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "unknown";

/** Runs a filesystem step of a Preferences command, failing as `action` with the error's code. */
const attempt = <A>(action: CommentaryFileError["action"], run: () => Promise<A>) =>
  Effect.tryPromise({ try: run, catch: (error) => new CommentaryFileError({ action, reason: errorCode(error) }) });

/** Every `.cfg` in the commentary folder, sorted by name. A folder that can't be read lists nothing. */
const listFiles = (userDataDir: string) =>
  Effect.promise(() =>
    readdir(commentaryFolder(userDataDir)).then(
      (names) => ({ names: names.filter((name) => name.toLowerCase().endsWith(".cfg")).sort(compareCodeUnits), failure: null }),
      (error: unknown) => ({ names: [], failure: errorCode(error) }),
    ),
  ).pipe(
    Effect.tap(({ failure }) =>
      failure === null ? Effect.void : Effect.logWarning("commentary folder could not be read", { failure }),
    ),
    Effect.map(({ names }) => names),
  );

/** The file the game reads. That is the player's choice while it is still in the folder, else `events.cfg`. */
const activeFile = (userDataDir: string, files: ReadonlyArray<string>): Promise<string> =>
  readFile(path.join(userDataDir, CHOSEN_COMMENTARY_FILE), "utf8").then(
    (chosen) => path.join(commentaryFolder(userDataDir), files.includes(chosen.trim()) ? chosen.trim() : GAME_FILE_NAME),
    () => commentaryPath(userDataDir),
  );

const modifiedAt = (file: string): Promise<number | null> => stat(file).then((info) => info.mtimeMs, () => null);

const writeShipped = (file: string, flag: "w" | "wx"): Promise<void> =>
  mkdir(path.dirname(file), { recursive: true }).then(() => writeFile(file, SHIPPED_COMMENTARY_TEXT, { encoding: "utf8", flag }));

/** Writes the shipped file where the player can find it, the first time. A failure, such as a read-only folder,
 *  is logged, and the game goes on with the shipped lines. */
const seedShipped = (file: string) =>
  Effect.promise(() => writeShipped(file, "wx").then(() => null, errorCode)).pipe(
    Effect.flatMap((failure) =>
      failure === null ? Effect.void : Effect.logWarning("commentary file could not be written", { failure }),
    ),
  );

/** The player's lines over the shipped ones, and what was skipped. */
const loadCommentary = (userDataDir: string): Effect.Effect<Loaded> =>
  Effect.gen(function* () {
    if ((yield* Effect.promise(() => modifiedAt(commentaryPath(userDataDir)))) === null) {
      yield* seedShipped(commentaryPath(userDataDir));
    }
    const files = yield* listFiles(userDataDir);
    const file = yield* Effect.promise(() => activeFile(userDataDir, files));
    const mtimeMs = yield* Effect.promise(() => modifiedAt(file));
    if (mtimeMs === null) return { file, files, table: SHIPPED_COMMENTARY, problems: [], newSections: [] };
    const cached = parsed.get(file);
    if (cached !== undefined && cached.mtimeMs === mtimeMs) return { ...cached, files };

    const text = yield* Effect.promise(() => readFile(file, "utf8").catch(() => null));
    if (text === null) return { file, files, table: SHIPPED_COMMENTARY, problems: [], newSections: [] };
    const { table, problems, version } = parseCommentaryFile(text, SHIPPED_COMMENTARY);
    if (problems.length > 0) yield* Effect.logWarning("commentary file has lines the game skipped", { problems });
    const newSections = version < SHIPPED_PARSE.version ? missingCommentarySections(text, SHIPPED_COMMENTARY_TEXT) : [];
    const loaded = { file, files, mtimeMs, table, problems, newSections };
    parsed.set(file, loaded);
    return loaded;
  });

/** The commentary table for `userDataDir`'s file, with the player's lines over the shipped ones. */
export const loadCommentaryTable = (userDataDir: string): Effect.Effect<CommentaryTable> =>
  loadCommentary(userDataDir).pipe(Effect.map((loaded) => loaded.table));

export const commentaryFileStatus = (userDataDir: string): Effect.Effect<CommentaryFileStatusView> =>
  loadCommentary(userDataDir).pipe(
    Effect.map(
      ({ file, files, problems, newSections }) =>
        new CommentaryFileStatusView({
          files: [...files],
          active: path.basename(file),
          problems: [...problems],
          newSections: [...newSections],
        }),
    ),
  );

/** Hands the file the game reads, or the commentary folder, to the operating system. */
export const openCommentaryFile = (userDataDir: string, target: "file" | "folder", openPath: OpenPath | undefined) =>
  Effect.gen(function* () {
    const { file } = yield* loadCommentary(userDataDir);
    if (openPath === undefined) return yield* new CommentaryFileError({ action: "open", reason: "no-application" });
    const failure = yield* attempt("open", () => openPath(target === "file" ? file : commentaryFolder(userDataDir)));
    if (failure !== "") {
      yield* Effect.logWarning("commentary file could not be opened", { target, failure });
      return yield* new CommentaryFileError({ action: "open", reason: "no-application" });
    }
    return yield* commentaryFileStatus(userDataDir);
  });

/** Makes `name` the file the game reads. */
export const chooseCommentaryFile = (userDataDir: string, name: string) =>
  Effect.gen(function* () {
    const { files } = yield* loadCommentary(userDataDir);
    if (!files.includes(name)) return yield* new CommentaryFileError({ action: "choose", reason: "not-in-folder" });
    yield* attempt("choose", () => writeFile(path.join(userDataDir, CHOSEN_COMMENTARY_FILE), name, "utf8"));
    return yield* commentaryFileStatus(userDataDir);
  });

/** Brings the chosen file up to the game's version. With `addNewSections` it appends the sections it
 *  lacks; either way raises its version so the offer isn't repeated. */
export const updateCommentaryFile = (userDataDir: string, addNewSections: boolean) =>
  Effect.gen(function* () {
    const { file } = yield* loadCommentary(userDataDir);
    const text = yield* attempt("update", () => readFile(file, "utf8"));
    const upgraded = upgradeCommentaryFile(text, SHIPPED_COMMENTARY_TEXT, { addSections: addNewSections }).text;
    yield* attempt("update", () => writeFile(file, upgraded, "utf8"));
    return yield* commentaryFileStatus(userDataDir);
  });

/** Replaces `events.cfg` with the game's own lines and makes it the file the game reads. */
export const resetCommentaryFile = (userDataDir: string) =>
  Effect.gen(function* () {
    yield* attempt("reset", () => writeShipped(commentaryPath(userDataDir), "w"));
    yield* attempt("reset", () => writeFile(path.join(userDataDir, CHOSEN_COMMENTARY_FILE), GAME_FILE_NAME, "utf8"));
    return yield* commentaryFileStatus(userDataDir);
  });
