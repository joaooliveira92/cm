import { chmod, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { SHIPPED_COMMENTARY_TEXT as SHIPPED_TEXT, parseCommentaryFile } from "@cm-clone/game-engine";
import {
  COMMENTARY_FILE,
  SHIPPED_COMMENTARY,
  chooseCommentaryFile,
  commentaryFileStatus,
  loadCommentaryTable,
  openCommentaryFile,
  resetCommentaryFile,
  updateCommentaryFile,
} from "../../../src/main/match/commentaryFile.js";

/** A fresh user data folder. */
const userData = () => Effect.promise(() => mkdtemp(path.join(tmpdir(), "cm-commentary-")));

/** Rewrites the player's file with a distinct modification time, as a later save in an editor would. */
const edit = (dir: string, text: string, at: number) =>
  Effect.promise(async () => {
    const file = path.join(dir, COMMENTARY_FILE);
    await writeFile(file, text, "utf8");
    await utimes(file, at, at);
  });

describe("the player's commentary file (cm-style-commentary 02)", () => {
  it.effect("is written from the shipped file the first time, for the player to find and edit", () =>
    Effect.gen(function* () {
      const dir = yield* userData();
      const table = yield* loadCommentaryTable(dir);
      expect(table).toEqual(SHIPPED_COMMENTARY);
      const written = yield* Effect.promise(() => readFile(path.join(dir, COMMENTARY_FILE), "utf8"));
      expect(written).toBe(SHIPPED_TEXT);
    }),
  );

  it.effect("is read again when it changes, and its lines replace the shipped ones", () =>
    Effect.gen(function* () {
      const dir = yield* userData();
      yield* loadCommentaryTable(dir);
      yield* edit(dir, "[Foul]\n{player} hacks him down.\n", 1_000);
      const first = yield* loadCommentaryTable(dir);
      expect(first.templates.Foul).toEqual(["{player} hacks him down."]);
      expect(first.templates.Offside).toEqual(SHIPPED_COMMENTARY.templates.Offside);
      expect(yield* loadCommentaryTable(dir)).toBe(first);

      yield* edit(dir, "[Foul]\n{player} is penalised.\n", 2_000);
      expect((yield* loadCommentaryTable(dir)).templates.Foul).toEqual(["{player} is penalised."]);
    }),
  );

  it.effect("keeps the shipped lines for a section the player broke", () =>
    Effect.gen(function* () {
      const dir = yield* userData();
      yield* loadCommentaryTable(dir);
      yield* edit(dir, "[Foul]\n{nobody} fouls.\n", 3_000);
      expect((yield* loadCommentaryTable(dir)).templates.Foul).toEqual(SHIPPED_COMMENTARY.templates.Foul);
    }),
  );
});

describe("Preferences' view of the commentary file (cm-style-commentary 04)", () => {
  it.effect("names the file, never its path, and lists what the game skipped in it", () =>
    Effect.gen(function* () {
      const dir = yield* userData();
      const fresh = yield* commentaryFileStatus(dir);
      expect(fresh.active).toBe("events.cfg");
      expect(JSON.stringify(fresh)).not.toContain(dir);
      expect(fresh.problems).toEqual([]);

      yield* edit(dir, "[Foul]\n{player} fouls {player2}.\n{player} fouls.\n", 4_000);
      expect((yield* commentaryFileStatus(dir)).problems).toEqual([
        expect.stringMatching(/^line 2: skipped, \{player2\} isn't available in \[Foul\] \(it has \{player\}, /),
      ]);
    }),
  );

  it.effect("resets the file to the game's own lines", () =>
    Effect.gen(function* () {
      const dir = yield* userData();
      yield* loadCommentaryTable(dir);
      yield* edit(dir, "[Foul]\n{nobody}\n", 5_000);
      const status = yield* resetCommentaryFile(dir);
      expect(status.problems).toEqual([]);
      expect(yield* Effect.promise(() => readFile(path.join(dir, COMMENTARY_FILE), "utf8"))).toBe(SHIPPED_TEXT);
    }),
  );

  it.effect("hands the file or its folder to the operating system", () =>
    Effect.gen(function* () {
      const dir = yield* userData();
      const opened: Array<string> = [];
      const shell = async (target: string) => {
        opened.push(target);
        return "";
      };
      yield* openCommentaryFile(dir, "file", shell);
      yield* openCommentaryFile(dir, "folder", shell);
      expect(opened).toEqual([path.join(dir, COMMENTARY_FILE), path.join(dir, "commentary")]);
    }),
  );

  it.effect("fails, with a code and no path, when nothing opens the file or a write is refused (review fix)", () =>
    Effect.gen(function* () {
      const dir = yield* userData();
      const refused = yield* Effect.flip(openCommentaryFile(dir, "file", async () => `No application knows how to open ${dir}`));
      expect(refused).toMatchObject({ _tag: "CommentaryFileError", action: "open", reason: "no-application" });

      // A folder the game may not write to.
      yield* loadCommentaryTable(dir);
      yield* Effect.promise(() => chmod(path.join(dir, "commentary"), 0o500));
      yield* Effect.promise(() => chmod(path.join(dir, COMMENTARY_FILE), 0o400));
      const reset = yield* Effect.flip(resetCommentaryFile(dir));
      yield* Effect.promise(() => chmod(path.join(dir, "commentary"), 0o700));
      expect(reset).toMatchObject({ _tag: "CommentaryFileError", action: "reset", reason: "EACCES" });
      expect(JSON.stringify(reset)).not.toContain(dir);
    }),
  );
});

describe("choosing a commentary file (cm-style-commentary 09)", () => {
  /** Drops another commentary file into the folder, as a player installing a translation would. */
  const install = (dir: string, name: string, text: string) =>
    Effect.promise(() => writeFile(path.join(dir, "commentary", name), text, "utf8"));

  it.effect("offers every .cfg in the folder, and reads the one chosen", () =>
    Effect.gen(function* () {
      const dir = yield* userData();
      yield* loadCommentaryTable(dir);
      yield* install(dir, "events_fr.cfg", "[Foul]\nFaute de {player}.\n");
      yield* install(dir, "notes.txt", "not commentary");

      const before = yield* commentaryFileStatus(dir);
      expect(before.files).toEqual(["events.cfg", "events_fr.cfg"]);
      expect(before.active).toBe("events.cfg");

      const after = yield* chooseCommentaryFile(dir, "events_fr.cfg");
      expect(after.active).toBe("events_fr.cfg");
      expect((yield* loadCommentaryTable(dir)).templates.Foul).toEqual(["Faute de {player}."]);
    }),
  );

  it.effect("refuses a name that isn't in the folder, and keeps the choice it had", () =>
    Effect.gen(function* () {
      const dir = yield* userData();
      const refused = yield* Effect.flip(chooseCommentaryFile(dir, "../../secrets.cfg"));
      expect(refused).toMatchObject({ _tag: "CommentaryFileError", action: "choose", reason: "not-in-folder" });
      expect((yield* commentaryFileStatus(dir)).active).toBe("events.cfg");
    }),
  );

  it.effect("goes back to events.cfg when the chosen file disappears, and when the player resets", () =>
    Effect.gen(function* () {
      const dir = yield* userData();
      yield* loadCommentaryTable(dir);
      yield* install(dir, "community.cfg", "[Foul]\nFoul!\n");
      yield* chooseCommentaryFile(dir, "community.cfg");
      yield* Effect.promise(() => rm(path.join(dir, "commentary", "community.cfg")));
      expect((yield* commentaryFileStatus(dir)).active).toBe("events.cfg");

      yield* install(dir, "community.cfg", "[Foul]\nFoul!\n");
      yield* chooseCommentaryFile(dir, "community.cfg");
      const reset = yield* resetCommentaryFile(dir);
      expect(reset.active).toBe("events.cfg");
      expect(yield* Effect.promise(() => readFile(path.join(dir, "commentary", "community.cfg"), "utf8"))).toBe("[Foul]\nFoul!\n");
    }),
  );
});

describe("an older commentary file (cm-style-commentary 10)", () => {
  const OLD = "# my commentary, from before versions\n[Foul]\n{player} hacks him down.\n";

  it.effect("lists the sections the game has and an older file lacks, and adds them on request", () =>
    Effect.gen(function* () {
      const dir = yield* userData();
      yield* loadCommentaryTable(dir);
      expect((yield* commentaryFileStatus(dir)).newSections).toEqual([]);

      yield* edit(dir, OLD, 6_000);
      const older = yield* commentaryFileStatus(dir);
      expect(older.newSections).toContain("Offside");
      expect(older.newSections).not.toContain("Foul");

      const updated = yield* updateCommentaryFile(dir, true);
      expect(updated.newSections).toEqual([]);
      expect(updated.problems).toEqual([]);
      const text = yield* Effect.promise(() => readFile(path.join(dir, COMMENTARY_FILE), "utf8"));
      expect(text).toContain("[Foul]\n{player} hacks him down.\n");
      expect(text).toContain("[Offside]");
    }),
  );

  it.effect("stops offering once the player keeps the file as it is", () =>
    Effect.gen(function* () {
      const dir = yield* userData();
      yield* loadCommentaryTable(dir);
      yield* edit(dir, OLD, 7_000);
      const kept = yield* updateCommentaryFile(dir, false);
      expect(kept.newSections).toEqual([]);
      const shippedVersion = parseCommentaryFile(SHIPPED_TEXT).version;
      expect(yield* Effect.promise(() => readFile(path.join(dir, COMMENTARY_FILE), "utf8"))).toBe(`version = ${shippedVersion}\n\n${OLD}`);
    }),
  );
});
