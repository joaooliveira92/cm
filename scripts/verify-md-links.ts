/**
 * Verify that Markdown documentation points at things that exist. Two passes
 * over the same corpus:
 *
 * 1. **Links** — every relative or repo-root-absolute `[text](path)` target
 *    resolves to a real file. Trimmed from reference-project's
 *    verify-md-links.ts: no mdast parser dependency and no anchor/fragment
 *    checking (this repo has no `#fragment` links today — that was decided in
 *    the `skill-suite-merge` effort, since archived out of the working tree
 *    and recoverable from git history; revisit here if fragments appear).
 * 2. **Inline code paths** — a backticked `apps/desktop/src/main/season.ts`
 *    resolves too. Pass 1 saw nothing inside backticks, and in an agent-heavy
 *    repo a stale path in prose is worse than a broken link: an agent reads
 *    the sentence, believes it, and builds against a file that is not there.
 *    A thirteen-ticket refactor moved most source paths in this repo and left
 *    live tickets and READMEs quietly pointing at the old ones; that is the
 *    class of bug this pass exists to make loud.
 *
 * Every `.md` file in the repo is scanned except an ignore list, rather than
 * an explicit include-list, so newly added skills, tickets, and Agent Notes
 * are covered automatically without updating this script.
 *
 * ## Why pass 2 only checks *anchored* paths
 *
 * Package-relative citation is idiomatic here: tickets and notes write
 * `main/season.ts` or `test/season.test.ts` relative to `apps/desktop/src` or
 * `apps/desktop`, not the repo root. Resolving those would mean guessing a
 * base directory from a candidate list, and every wrong guess is a false
 * positive in a gate people are supposed to trust. So a candidate is only
 * checked when it starts at a real repo top-level directory (CHECKED_ANCHORS)
 * — an unambiguous claim about where a file lives, resolvable exactly. Note
 * that `db/` is deliberately absent from that list: the `db/` directories in
 * this repo live inside packages, so a backticked `db/schema.ts` is
 * package-relative and unresolvable from the root.
 *
 * ## Why pass 2 only checks *file-shaped* paths
 *
 * A candidate must end in an extension. Directory mentions in this repo are
 * routinely conceptual rather than factual — `docs/adr/` appears a dozen
 * times in prose that exists precisely to say this repo does *not* have one,
 * and `.scratch/<effort>/` names efforts not yet started. Requiring an
 * extension drops that entire noise class while keeping the failure mode
 * worth catching, which is file-shaped: an agent opening a path that moved.
 *
 * ## Why some trees are exempt (HISTORICAL_PREFIXES, TERMINAL_STATUSES)
 *
 * The repo holds two kinds of document and they want opposite treatment.
 *
 * A **live instruction** — a README, a skill, an open ticket — is read as a
 * statement about the codebase as it is now. A stale path in one is a defect
 * and gets fixed.
 *
 * A **historical record** — an Agent Note, a completed-effort report, a
 * resolved ticket — describes what was true when it was written. Its paths
 * are evidence, not directions. Rewriting them to today's layout would
 * falsify the record: a note explaining why `packages/contracts/src/schemas.ts`
 * was split reads as nonsense once you edit it to name the directory that
 * split produced. So those trees are exempt, and the exemption is a statement
 * about what the documents *are*, not a way to keep the gate quiet.
 *
 * `.scratch/` spans both, so it is split by the tracker's own `Status:` line
 * (docs/agents/issue-tracker.md) rather than by path: a resolved ticket is
 * history, an open one is an instruction an agent may act on tomorrow. That
 * also means a ticket left at `ready-for-agent` after it landed keeps being
 * checked — which is correct, because it keeps claiming to be actionable.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  // `.claude/skills/*` are symlinks into `.agents/skills/`. statSync follows them, so
  // scanning here would check every skill twice AND resolve its relative links against
  // the symlink's directory instead of the real one, reporting phantom breakage.
  ".claude",
  // Not this repo's authored content: a read-only copy of another project kept for
  // UI reference. Its links point at that project's tickets, which do not exist here.
  "external-reference",
  "dist",
  "build",
  ".turbo",
  "coverage",
])

interface Violation {
  file: string
  line: number
  /** "link" for a `[text](target)` target, "path" for a backticked source path. */
  kind: "link" | "path"
  target: string
}

/**
 * Repo top-level directories a backticked path may be anchored at. Anything
 * not starting with one of these is treated as package-relative and skipped —
 * see the "anchored paths" note at the top of this file.
 */
const CHECKED_ANCHORS = [
  ".agents/",
  ".ai/",
  ".github/",
  ".opencode/",
  ".scratch/",
  "apps/",
  "docs/",
  "packages/",
  "scripts/",
]

/**
 * Trees whose documents are historical records rather than live instructions,
 * exempt from the inline-path pass. Each entry is a reason, not a mute:
 */
const HISTORICAL_PREFIXES = [
  // Agent Notes are decision records, `proposed` no less than `implemented`:
  // both state what the code looked like at the moment the decision was taken.
  ".agents/notes/",
  // Per-effort write-ups of work already finished.
  ".ai/reports/",
  // Imported reference corpus describing another build of this game, not this
  // repo's file layout.
  "docs/specs/",
  // Third-party research reports vendored under a skill's references/; they
  // cite the upstream project's paths, not ours.
  ".agents/skills/effect-code/references/",
]

/** `.scratch/` ticket states that mean "already happened" — see docs/agents/issue-tracker.md. */
const TERMINAL_STATUSES = new Set(["resolved", "done", "wontfix", "superseded"])

/** Scheme-qualified (`https:`, `mailto:`) or protocol-relative (`//host`) — never checked. */
function isExternal(url: string): boolean {
  if (url.startsWith("//")) return true
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)
}

/** Strip `#fragment` and `?query`, then percent-decode so an encoded target probes the real filename. */
function pathPart(url: string): string {
  const raw = url.replace(/[#?].*$/, "")
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** Remove fenced code blocks (``` and ~~~) so example/template links inside them aren't checked as real. */
function stripFencedCode(source: string): string {
  return source.replace(/^(```|~~~).*$[\s\S]*?^\1.*$/gm, (match) =>
    match.replace(/[^\n]/g, " "))
}

function findMarkdownFiles(dir: string, out: Array<string> = []): Array<string> {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue
    const abs = join(dir, entry)
    const stat = statSync(abs)
    if (stat.isDirectory()) {
      findMarkdownFiles(abs, out)
    } else if (entry.endsWith(".md")) {
      out.push(abs)
    }
  }
  return out
}

const LINK_PATTERN = /!?\[[^\]]*\]\(([^)]+)\)/g

/** Inline code spans. Fenced blocks are blanked out before this runs. */
const CODE_SPAN_PATTERN = /`([^`\n]+)`/g

/**
 * Glob, brace, and placeholder metacharacters. `packages/*`,
 * `test/**\/*.test.{ts,tsx}` and `.agents/notes/{class}/` are patterns, not
 * paths; whitespace and shell characters mean the span is a command line.
 */
const NOT_A_PATH = /[*?{}[\]<>|$()!\s]/

/** A trailing `:11`, `:60-71`, or `:440,459-467` line reference, or a `#symbol` suffix. */
const LOCATION_SUFFIX = /(?::\d+(?:[-,]\d+)*)+$|#.*$/

/** Last segment carries an extension, e.g. `.ts` — see the "file-shaped" note above. */
const HAS_EXTENSION = /\.[A-Za-z][A-Za-z0-9]*$/

/**
 * A `.scratch/` ticket in a terminal state is a record of finished work, so
 * its paths are historical. Read from the file being scanned rather than
 * passed in, because the tracker keeps status inside the ticket itself.
 */
function isSettledTicket(file: string, source: string): boolean {
  if (!file.startsWith(".scratch/")) return false
  const match = /^\**Status:\**\s*(\S+)/im.exec(source)
  if (match === null) return false
  return TERMINAL_STATUSES.has(match[1]!.toLowerCase())
}

function checksInlinePaths(file: string, source: string): boolean {
  if (HISTORICAL_PREFIXES.some((prefix) => file.startsWith(prefix))) return false
  return !isSettledTicket(file, source)
}

function findViolations(absPath: string): Array<Violation> {
  const file = relative(root, absPath)
  const dir = dirname(absPath)
  const raw = readFileSync(absPath, "utf8")
  const source = stripFencedCode(raw)
  const out: Array<Violation> = []
  const inlinePaths = checksInlinePaths(file, raw)

  const lines = source.split("\n")
  lines.forEach((lineText, index) => {
    for (const match of lineText.matchAll(LINK_PATTERN)) {
      const rawUrl = match[1]?.trim()
      if (!rawUrl) continue
      // Split off a Markdown title (`"..."`) if present: [text](url "title").
      const url = rawUrl.split(/\s+"/)[0]!.trim()
      if (isExternal(url)) continue
      const target = pathPart(url)
      if (target === "") continue
      // Template placeholder, not a real path: `(<relative-path-to-note>)`,
      // `({class}/yyyy-mm-dd-topic.md)` — this repo's skill docs use both
      // shapes inline in prose (not just inside fenced code) to describe a
      // link's future shape rather than link anywhere real.
      if (target.startsWith("<") || target.includes("{")) continue
      const resolved = isAbsolute(target)
        ? join(root, target) // repo-root-absolute, e.g. /docs/adr/0010-...
        : resolve(dir, target)
      if (!existsSync(resolved)) {
        out.push({ file, line: index + 1, kind: "link", target: url })
      }
    }

    if (!inlinePaths) return
    for (const match of lineText.matchAll(CODE_SPAN_PATTERN)) {
      const span = match[1]!.trim()
      if (!CHECKED_ANCHORS.some((anchor) => span.startsWith(anchor))) continue
      if (NOT_A_PATH.test(span)) continue
      // Trailing prose punctuation: "see `apps/desktop/src/main/season.ts`," survives
      // the code span in some authors' hands as part of the span itself.
      const target = span.replace(LOCATION_SUFFIX, "").replace(/[.,;]+$/, "")
      if (!HAS_EXTENSION.test(target)) continue
      if (!existsSync(join(root, target))) {
        out.push({ file, line: index + 1, kind: "path", target })
      }
    }
  })
  return out
}

const files = findMarkdownFiles(root)
const all = files.flatMap(findViolations)

if (all.length === 0) {
  console.log(
    `verify-md-links: ${files.length} file(s) checked, all links and inline code paths resolve.`,
  )
  process.exit(0)
}

console.error("verify-md-links: unresolvable references found:")
for (const violation of all) {
  const label = violation.kind === "link" ? "broken link" : "stale inline path"
  console.error(`  ${violation.file}:${violation.line}  ${violation.target}  (${label}: target does not exist)`)
}
process.exit(1)
