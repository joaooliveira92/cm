import { mkdtemp, readFile, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { SHIPPED_COMMENTARY_TEXT as SHIPPED_TEXT } from "@cm-clone/game-engine";
import {
  COMMENTARY_FILE,
  SHIPPED_COMMENTARY,
  commentaryFileStatus,
  loadCommentaryTable,
  openCommentaryFile,
  resetCommentaryFile,
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
      expect(table).toBe(SHIPPED_COMMENTARY);
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
  it.effect("names the file, and lists what the game skipped in it", () =>
    Effect.gen(function* () {
      const dir = yield* userData();
      const fresh = yield* commentaryFileStatus(dir);
      expect(fresh.file).toBe(path.join(dir, COMMENTARY_FILE));
      expect(fresh.problems).toEqual([]);

      yield* edit(dir, "[Foul]\n{player} fouls {player2}.\n{player} fouls.\n", 4_000);
      expect((yield* commentaryFileStatus(dir)).problems).toEqual([
        "line 2: skipped, {player2} isn't available in [Foul] (it has {player}, {team}, {team2})",
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
      expect(yield* Effect.promise(() => readFile(status.file, "utf8"))).toBe(SHIPPED_TEXT);
    }),
  );

  it.effect("hands the file to the operating system, and survives the shell refusing", () =>
    Effect.gen(function* () {
      const dir = yield* userData();
      const opened: Array<string> = [];
      yield* openCommentaryFile(dir, async (file) => {
        opened.push(file);
        return "";
      });
      expect(opened).toEqual([path.join(dir, COMMENTARY_FILE)]);
      const status = yield* openCommentaryFile(dir, async () => "no application to open .cfg");
      expect(status.file).toBe(path.join(dir, COMMENTARY_FILE));
    }),
  );
});
