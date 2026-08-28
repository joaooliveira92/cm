/**
 * Verify that relative and repo-root-absolute Markdown links resolve to a
 * real file. Trimmed from reference-project's verify-md-links.ts: no mdast
 * parser dependency and no anchor/fragment checking (this repo has no
 * `#fragment` links today — see the map's decision at
 * .scratch/skill-suite-merge/map.md if that changes and this needs
 * extending). Every `.md` file in the repo is scanned except an ignore list,
 * rather than an explicit include-list, so newly added skills, tickets, and
 * Agent Notes are covered automatically without updating this script.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "reference-project", // external mirror, not this repo's authored content
  "dist",
  "build",
  ".turbo",
  "coverage",
])

interface Violation {
  file: string
  line: number
  url: string
}

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

function findViolations(absPath: string): Array<Violation> {
  const file = relative(root, absPath)
  const dir = dirname(absPath)
  const source = stripFencedCode(readFileSync(absPath, "utf8"))
  const out: Array<Violation> = []

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
        out.push({ file, line: index + 1, url })
      }
    }
  })
  return out
}

const files = findMarkdownFiles(root)
const all = files.flatMap(findViolations)

if (all.length === 0) {
  console.log(`verify-md-links: ${files.length} file(s) checked, all relative and root-absolute links resolve.`)
  process.exit(0)
}

console.error("verify-md-links: broken links found:")
for (const violation of all) {
  console.error(`  ${violation.file}:${violation.line}  ${violation.url}  (target does not exist)`)
}
process.exit(1)
