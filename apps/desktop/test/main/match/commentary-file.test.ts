import { mkdtemp, readFile, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { SHIPPED_COMMENTARY_TEXT as SHIPPED_TEXT } from "@cm-clone/game-engine";
import { COMMENTARY_FILE, SHIPPED_COMMENTARY, loadCommentaryTable } from "../../../src/main/match/commentaryFile.js";

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
