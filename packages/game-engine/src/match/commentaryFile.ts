import {
  ALWAYS_SHOWN,
  COMMENTARY_SECTIONS,
  HIGHLIGHT_LEVELS,
  isHighlightLevel,
  PHRASES,
  PHRASES_SECTION,
  type PhraseName,
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
/** A `[Section]` name: a moment of a match, or the phrases. */
export type CommentarySectionName = CommentaryTemplateKey | typeof PHRASES_SECTION;

export interface ParsedCommentaryFile {
  readonly table: CommentaryTable;
  /** The file's `version = N`, 0 when it has none (cm-style-commentary 10). */
  readonly version: number;
  /** The sections the file itself has, in order of first appearance; the rest come from the fallback. */
  readonly sections: ReadonlyArray<CommentarySectionName>;
  /** One sentence per skipped line or missing section, with its line number, for the log. */
  readonly problems: ReadonlyArray<string>;
}

const DEFAULT_PLAYBACK: CommentaryPlayback = { delayMs: 1000, flash: false, displayChance: 1, level: "full" };
const MAX_DELAY_MS = 60_000;

const SECTION = /^\[([^\]]+)\]$/;
const VERSION = /^version\s*=\s*(\d+)$/i;
const PHRASE = /^([\w.]+)\s*=\s*(.*)$/;

/** Why `name = value` can't be a phrase, or null when it can. */
const phraseProblem = (name: string, value: string): string | null => {
  const allowed = PHRASES.get(name as PhraseName);
  if (allowed === undefined) return `there is no phrase ${name}`;
  if (value === "") return `${name} is empty`;
  for (const [, placeholder] of value.matchAll(PLACEHOLDER)) {
    if (!allowed.includes(placeholder!)) {
      return allowed.length === 0
        ? `${name} can't use {${placeholder}}`
        : `{${placeholder}} isn't available in ${name} (it has ${allowed.map((p) => `{${p}}`).join(", ")})`;
    }
  }
  return null;
};
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
      const level = value.toLowerCase();
      if (!isHighlightLevel(level)) return `level must be ${HIGHLIGHT_LEVELS.slice(0, -1).join(", ")} or ${HIGHLIGHT_LEVELS.at(-1)}`;
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
  let version = 0;
  let inPhrases = false;
  const sections: Array<CommentarySectionName> = [];
  const phrases = new Map<PhraseName, string>();

  text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const line = raw.trim();
      const at = `line ${index + 1}`;
      if (line === "" || line.startsWith("#")) return;

      const section = SECTION.exec(line);
      if (section !== null) {
        const name = section[1]!.trim();
        inPhrases = name === PHRASES_SECTION;
        if (inPhrases) {
          if (!sections.includes(PHRASES_SECTION)) sections.push(PHRASES_SECTION);
          current = null;
          skipping = false;
          return;
        }
        const key = name as CommentaryTemplateKey;
        if (!COMMENTARY_SECTIONS.has(key)) {
          problems.push(`${at}: there is no section [${section[1]}]; its lines are skipped`);
          current = null;
          skipping = true;
          return;
        }
        if (!sections.includes(key)) sections.push(key);
        let draft = drafts.get(key);
        if (draft === undefined) {
          draft = { lines: [] };
          drafts.set(key, draft);
        }
        current = { key, draft };
        skipping = false;
        return;
      }
      if (inPhrases) {
        const phrase = PHRASE.exec(line);
        const problem = phrase === null ? "a phrase is written name = text" : phraseProblem(phrase[1]!, phrase[2]!.trim());
        if (problem === null) phrases.set(phrase![1]! as PhraseName, phrase![2]!.trim());
        else problems.push(`${at}: skipped, ${problem}`);
        return;
      }
      if (current === null) {
        const versionLine = VERSION.exec(line);
        if (versionLine !== null && !skipping && sections.length === 0) {
          version = Number(versionLine[1]);
          return;
        }
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
  const phraseTable = {} as Record<PhraseName, string>;
  for (const name of PHRASES.keys()) {
    const value = phrases.get(name) ?? fallback?.phrases[name];
    if (value === undefined) problems.push(`[${PHRASES_SECTION}] has no ${name}`);
    phraseTable[name] = value ?? "";
  }
  return { table: { templates, playback, phrases: phraseTable }, problems, version, sections };
};

/** One `[Section]` of a file's text: its header line up to the next header, comments and blank lines
 *  included, so an appended section reads exactly as it does in the shipped file. */
const sectionBlocks = (text: string): ReadonlyMap<string, string> => {
  const blocks = new Map<string, string>();
  let name: string | null = null;
  let lines: Array<string> = [];
  const close = () => {
    if (name !== null && !blocks.has(name)) blocks.set(name, lines.join("\n").trimEnd());
  };
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const section = SECTION.exec(line.trim());
    if (section !== null) {
      close();
      name = section[1]!.trim();
      lines = [];
    }
    if (name !== null) lines.push(line);
  }
  close();
  return blocks;
};

export interface CommentaryFileUpgrade {
  /** The player's text with the missing sections appended and its version raised. */
  readonly text: string;
  /** The sections appended, in the shipped file's order. */
  readonly added: ReadonlyArray<CommentarySectionName>;
}

/** The sections `shippedText` has and `playerText` lacks, in the shipped file's order. */
export const missingCommentarySections = (playerText: string, shippedText: string): ReadonlyArray<CommentarySectionName> => {
  const present = new Set(parseCommentaryFile(playerText).sections);
  return parseCommentaryFile(shippedText).sections.filter((key) => !present.has(key));
};

/**
 * Brings a player's commentary file up to the shipped one's version (cm-style-commentary 10): appends,
 * word for word, every section the shipped file has and the player's lacks, and sets its `version`.
 * With `addSections: false` only the version is set, for a player who keeps the file as it is. The
 * player's own sections, lines, comments and settings are never touched.
 */
export const upgradeCommentaryFile = (
  playerText: string,
  shippedText: string,
  { addSections = true }: { readonly addSections?: boolean } = {},
): CommentaryFileUpgrade => {
  const shipped = parseCommentaryFile(shippedText);
  const added = addSections ? missingCommentarySections(playerText, shippedText) : [];
  const blocks = sectionBlocks(shippedText);
  const versionLine = `version = ${shipped.version}`;
  const lines = playerText.replace(/^\uFEFF/, "").split(/\r?\n/);
  const at = lines.findIndex((line) => VERSION.test(line.trim()));
  const withVersion = at >= 0 ? lines.map((line, index) => (index === at ? versionLine : line)) : [versionLine, "", ...lines];
  const appended = added.map((key) => blocks.get(key)!).join("\n\n");
  const body = withVersion.join("\n").trimEnd();
  return { text: added.length === 0 ? `${body}\n` : `${body}\n\n${appended}\n`, added };
};
