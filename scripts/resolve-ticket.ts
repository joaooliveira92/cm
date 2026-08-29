/**
 * Mark a local-markdown ticket resolved: check every unchecked acceptance
 * criterion and flip its `Status:` line to `resolved`. Exists so cm-implement
 * ends its run with a deterministic step instead of an LLM manually editing
 * checkboxes and status text, which was getting forgotten under context
 * pressure — see .agents/notes/proposed/process/ for the decision.
 *
 * Usage: tsx scripts/resolve-ticket.ts <path-to-ticket.md>
 */
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

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
