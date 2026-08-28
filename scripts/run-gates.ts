/**
 * Run this repo's quality gates from one named source of truth, so CI, a local
 * `pnpm run check:all`, and cm-implement's "run the full test suite" step all
 * invoke the same profiles instead of the workflow YAML and package.json
 * scripts drifting apart. Trimmed from reference-project's run-gates.ts: no
 * bounded parallel scheduler, no coverage partitioning — this repo has four
 * gates, run sequentially, which is plenty at this scale.
 */
import { spawnSync } from "node:child_process"

type Mode = "check-all" | "ci"

interface Gate {
  id: string
  command: string
  args: string[]
}

const GATES: Record<Mode, ReadonlyArray<Gate>> = {
  "check-all": [
    { id: "typecheck", command: "pnpm", args: ["-r", "typecheck"] },
    { id: "lint", command: "pnpm", args: ["run", "lint"] },
    { id: "verify-md-links", command: "pnpm", args: ["run", "verify-md-links"] },
    { id: "test", command: "pnpm", args: ["-r", "test"] },
  ],
  // Excludes test:e2e: that gate needs OS-level setup (xvfb, system libs) the
  // CI workflow provisions around this command, not something to embed here.
  ci: [
    { id: "typecheck", command: "pnpm", args: ["-r", "typecheck"] },
    { id: "lint", command: "pnpm", args: ["run", "lint"] },
    { id: "verify-md-links", command: "pnpm", args: ["run", "verify-md-links"] },
    { id: "test", command: "pnpm", args: ["-r", "test"] },
  ],
}

function parseMode(raw: string | undefined): Mode {
  if (raw === "check-all" || raw === "ci") return raw
  throw new Error(`run-gates: expected mode check-all | ci, got ${JSON.stringify(raw)}.`)
}

interface GateOutcome {
  id: string
  passed: boolean
  durationMs: number
}

function main(argv: ReadonlyArray<string>): number {
  const mode = parseMode(argv[0])
  const gates = GATES[mode]
  console.log(`run-gates: ${mode} running ${gates.length} gate(s).`)

  const outcomes: Array<GateOutcome> = []
  for (const gate of gates) {
    const startedAt = performance.now()
    console.log(`\n▶ ${gate.id} (${gate.command} ${gate.args.join(" ")})`)
    const result = spawnSync(gate.command, gate.args, { stdio: "inherit" })
    const durationMs = performance.now() - startedAt
    const passed = result.status === 0
    outcomes.push({ id: gate.id, passed, durationMs })
    if (!passed) console.error(`✗ ${gate.id} failed after ${Math.round(durationMs)}ms`)
  }

  console.log("\nrun-gates summary:")
  for (const outcome of outcomes) {
    const mark = outcome.passed ? "✓" : "✗"
    console.log(`  ${mark} ${outcome.id} (${Math.round(outcome.durationMs)}ms)`)
  }

  return outcomes.every((outcome) => outcome.passed) ? 0 : 1
}

process.exitCode = main(process.argv.slice(2))
