import {
  ALWAYS_SHOWN,
  COMMENTARY_SECTIONS,
  HIGHLIGHT_LEVELS,
  type HighlightLevel,
  sectionTag,
  type CommentaryPlayback,
  type CommentaryTable,
  type CommentaryTemplateKey,
} from "./commentarySections.js";

/**
 * Reads a commentary file: the plain-text, player-editable `events.cfg` format, after Championship
 * Manager's file of the same name. The format is documented in the shipped file's header
 * (`packages/game-engine/data/events.cfg`).
 *
 * Nothing in a player's file can break a match: a line the game can't use is skipped and reported,
 * and a section that ends up with no lines, or a setting that's missing, takes `fallback`'s (the
 * shipped file's). Without a fallback a missing section is reported and left empty.
 */
export interface ParsedCommentaryFile {
  readonly table: CommentaryTable;
  /** One sentence per skipped line or missing section, with its line number, for the log. */
  readonly problems: ReadonlyArray<string>;
}

const DEFAULT_PLAYBACK: CommentaryPlayback = { delayMs: 1000, flash: false, displayChance: 1, level: "full" };
const MAX_DELAY_MS = 60_000;

const SECTION = /^\[([^\]]+)\]$/;
const SETTING = /^(delay|flash|chance|level)\s*=\s*(.*)$/i;
const PLACEHOLDER = /\{(\w+)\}/g;

interface SectionDraft {
  readonly lines: Array<string>;
  delayMs?: number;
  flash?: boolean;
  displayChance?: number;
  level?: HighlightLevel;
}

const parseFlag = (value: string): boolean | null => {
  const lower = value.toLowerCase();
  if (lower === "yes" || lower === "true") return true;
  if (lower === "no" || lower === "false") return false;
  return null;
};

/** Why `line` can't be used in `key`, or null when it can. */
const lineProblem = (key: CommentaryTemplateKey, line: string): string | null => {
  const allowed = COMMENTARY_SECTIONS.get(key)!;
  for (const [, name] of line.matchAll(PLACEHOLDER)) {
    if (!(allowed as ReadonlyArray<string>).includes(name!)) {
      return `{${name}} isn't available in [${key}] (it has ${allowed.map((p) => `{${p}}`).join(", ")})`;
    }
  }
  if (line.split("|").some((part) => part.trim() === "")) return "a | leaves an empty part";
  return null;
};

/** Applies one `name = value` setting to `draft`, or says why it can't. */
const applySetting = (draft: SectionDraft, key: CommentaryTemplateKey, name: string, value: string): string | null => {
  switch (name) {
    case "delay": {
      const ms = Number(value);
      if (!Number.isInteger(ms) || ms < 0 || ms > MAX_DELAY_MS) return `delay must be a whole number of milliseconds from 0 to ${MAX_DELAY_MS}`;
      draft.delayMs = ms;
      return null;
    }
    case "flash": {
      const flag = parseFlag(value);
      if (flag === null) return "flash must be yes or no";
      draft.flash = flag;
      return null;
    }
    case "level": {
      const level = value.toLowerCase() as HighlightLevel;
      if (!HIGHLIGHT_LEVELS.includes(level)) return "level must be key, extended or full";
      if (ALWAYS_SHOWN.has(sectionTag(key) as never) && level !== "key") return `[${key}] changes the match, so it is always key; level is ignored`;
      draft.level = level;
      return null;
    }
    default: {
      const percent = Number(value);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) return "chance must be a percentage from 0 to 100";
      if (ALWAYS_SHOWN.has(sectionTag(key) as never)) return `[${key}] changes the match, so it always shows; chance is ignored`;
      draft.displayChance = percent / 100;
      return null;
    }
  }
};

export const parseCommentaryFile = (text: string, fallback?: CommentaryTable): ParsedCommentaryFile => {
  const drafts = new Map<CommentaryTemplateKey, SectionDraft>();
  const problems: Array<string> = [];
  let current: { readonly key: CommentaryTemplateKey; readonly draft: SectionDraft } | null = null;
  let skipping = false;

  text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const line = raw.trim();
      const at = `line ${index + 1}`;
      if (line === "" || line.startsWith("#")) return;

      const section = SECTION.exec(line);
      if (section !== null) {
        const key = section[1]!.trim() as CommentaryTemplateKey;
        if (!COMMENTARY_SECTIONS.has(key)) {
          problems.push(`${at}: there is no section [${section[1]}]; its lines are skipped`);
          current = null;
          skipping = true;
          return;
        }
        let draft = drafts.get(key);
        if (draft === undefined) {
          draft = { lines: [] };
          drafts.set(key, draft);
        }
        current = { key, draft };
        skipping = false;
        return;
      }
      if (current === null) {
        if (!skipping) problems.push(`${at}: comes before any [Section], so it is skipped`);
        return;
      }

      const setting = SETTING.exec(line);
      if (setting !== null) {
        const problem = applySetting(current.draft, current.key, setting[1]!.toLowerCase(), setting[2]!.trim());
        if (problem !== null) problems.push(`${at}: ${problem}`);
        return;
      }

      const problem = lineProblem(current.key, line);
      if (problem === null) current.draft.lines.push(line);
      else problems.push(`${at}: skipped, ${problem}`);
    });

  const templates = {} as Record<CommentaryTemplateKey, ReadonlyArray<string>>;
  const playback = {} as Record<CommentaryTemplateKey, CommentaryPlayback>;
  for (const key of COMMENTARY_SECTIONS.keys()) {
    const draft = drafts.get(key);
    const base = fallback?.playback[key] ?? DEFAULT_PLAYBACK;
    if (draft === undefined || draft.lines.length === 0) {
      if (fallback === undefined) problems.push(`[${key}] is missing or has no usable lines`);
      else if (draft !== undefined) problems.push(`[${key}] has no usable lines, so the game's own are used`);
    }
    templates[key] = draft !== undefined && draft.lines.length > 0 ? draft.lines : (fallback?.templates[key] ?? []);
    playback[key] = {
      delayMs: draft?.delayMs ?? base.delayMs,
      flash: draft?.flash ?? base.flash,
      displayChance: ALWAYS_SHOWN.has(sectionTag(key) as never) ? 1 : (draft?.displayChance ?? base.displayChance),
      level: ALWAYS_SHOWN.has(sectionTag(key) as never) ? "key" : (draft?.level ?? base.level),
    };
  }
  return { table: { templates, playback }, problems };
};
