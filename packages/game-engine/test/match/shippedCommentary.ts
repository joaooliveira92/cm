import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { MatchEvent } from "../../src/match/events.js";
import { parseCommentaryFile } from "../../src/match/commentaryFile.js";
import { renderCommentary, type CommentaryNameResolver } from "../../src/match/commentary.js";

/** The commentary file the game ships, read from disk: the source the generated module is built from. */
export const SHIPPED_TEXT = readFileSync(fileURLToPath(new URL("../../data/events.cfg", import.meta.url)), "utf8");
export const SHIPPED = parseCommentaryFile(SHIPPED_TEXT).table;

export const renderShipped = (events: ReadonlyArray<MatchEvent>, seed: number, names: CommentaryNameResolver) =>
  renderCommentary(events, seed, names, SHIPPED);
