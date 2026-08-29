/**
 * Mark a local-markdown ticket resolved: check every unchecked acceptance
 * criterion and flip its `Status:` line to `resolved`. Exists so cm-implement
 * ends its run with a deterministic step instead of an LLM manually editing
 * checkboxes and status text, which was getting forgotten under context
 * pressure — see .agents/notes/proposed/process/ for the decision.
 *
 * Usage: tsx scripts/resolve-ticket.ts <path-to-ticket.md>
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const arg = process.argv[2]
if (!arg) {
  console.error("usage: tsx scripts/resolve-ticket.ts <path-to-ticket.md>")
  process.exit(1)
}

const path = resolve(arg)
let source: string
try {
  source = readFileSync(path, "utf8")
} catch {
  console.error(`resolve-ticket: no such file: ${path}`)
  process.exit(1)
}

const CHECKBOX_PATTERN = /^(\s*-\s*\[) \]/gm
// Matches both `Status: foo` (wayfinder tickets) and `**Status:** foo` (cm-to-tickets tickets).
const STATUS_PATTERN = /^(\*{0,2}Status:\*{0,2}\s*)(.+)$/m

const statusMatch = source.match(STATUS_PATTERN)
if (!statusMatch) {
  console.error(`resolve-ticket: no "Status:" line found in ${path}`)
  process.exit(1)
}

const boxesChecked = (source.match(CHECKBOX_PATTERN) ?? []).length
const previousStatus = statusMatch[2]!.trim()

let updated = source.replace(CHECKBOX_PATTERN, "$1x]")
updated = updated.replace(STATUS_PATTERN, `$1resolved`)

if (updated === source) {
  console.log(`resolve-ticket: ${path} already resolved, no changes.`)
  process.exit(0)
}

writeFileSync(path, updated)
console.log(
  `resolve-ticket: ${path} — checked ${boxesChecked} box(es), status "${previousStatus}" -> "resolved".`,
)

flagRoadmapDrift(path)

/**
 * roadmap.md is hand-written prose (resolved/open counts, tuning gaps, "next
 * step" narrative), not a template this script can safely regenerate. Instead
 * of rewriting it, flag when it's likely stale so a human/LLM edits it —
 * silent drift is exactly the "forgotten under context pressure" failure mode
 * this script already exists to close for checkboxes/Status.
 */
function flagRoadmapDrift(ticketPath: string): void {
  const effortMatch = ticketPath.match(/(.*\.scratch\/([^/]+))\/issues\//)
  if (!effortMatch) return
  const [, effortDir, effort] = effortMatch as [string, string, string]

  let issueFiles: Array<string>
  try {
    issueFiles = readdirSync(join(effortDir, "issues")).filter((f) => f.endsWith(".md"))
  } catch {
    return
  }

  let resolvedCount = 0
  for (const file of issueFiles) {
    const contents = readFileSync(join(effortDir, "issues", file), "utf8")
    if (STATUS_PATTERN.exec(contents)?.[2]?.trim() === "resolved") resolvedCount++
  }
  const totalCount = issueFiles.length

  const roadmapPath = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "roadmap.md")
  let roadmap: string
  try {
    roadmap = readFileSync(roadmapPath, "utf8")
  } catch {
    return
  }
  const lines = roadmap.split("\n")
  const anchorIndex = lines.findIndex((l) => l.includes(`.scratch/${effort}/`))
  if (anchorIndex === -1) {
    console.log(
      `resolve-ticket: docs/roadmap.md has no bullet referencing .scratch/${effort}/ — ${resolvedCount}/${totalCount} tickets resolved there now; consider whether it needs one.`,
    )
    return
  }

  let sectionHeading = ""
  for (let i = anchorIndex; i >= 0; i--) {
    const heading = lines[i]!.match(/^##\s+(.+)$/)
    if (heading) {
      sectionHeading = heading[1]!.trim()
      break
    }
  }

  if (resolvedCount === totalCount && sectionHeading !== "Shipped") {
    console.log(
      `resolve-ticket: ⚠ all ${totalCount} tickets in .scratch/${effort} are now resolved, but docs/roadmap.md still lists it under "## ${sectionHeading}" — move it to "## Shipped" and rewrite its summary.`,
    )
  } else {
    console.log(
      `resolve-ticket: .scratch/${effort} is now ${resolvedCount}/${totalCount} tickets resolved (under "## ${sectionHeading}" in docs/roadmap.md) — verify that bullet's prose still matches before treating the roadmap as current.`,
    )
  }
}
