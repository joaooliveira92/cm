import { readFileSync, readdirSync } from "node:fs"
import { join, extname } from "node:path"

interface LintViolation {
  file: string
  line: number
  message: string
  rule: string
}

interface Rule {
  name: string
  test: (line: string, index: number, lines: string[]) => LintViolation | null
  message: string
}

const rules: Rule[] = [
  {
    name: "no-effect-ignore",
    test: (line, idx): LintViolation | null =>
      /Effect\.ignore\(/.test(line)
        ? { file: "", line: idx + 1, message: "Effect.ignore silently discards errors. Use Effect.orDie or explicit error handling.", rule: "no-effect-ignore" }
        : null,
    message: "",
  },
  {
    name: "no-effect-asvoid",
    test: (line, idx): LintViolation | null =>
      /Effect\.asVoid\(/.test(line)
        ? { file: "", line: idx + 1, message: "Effect.asVoid is unnecessarily restrictive. Use Effect.void instead.", rule: "no-effect-asvoid" }
        : null,
    message: "",
  },
  {
    name: "no-effect-catchallcause",
    test: (line, idx): LintViolation | null =>
      /Effect\.catchAllCause\(/.test(line)
        ? { file: "", line: idx + 1, message: "Effect.catchAllCause catches defects/bugs. Use Effect.catchAll or Effect.catchTag instead.", rule: "no-effect-catchallcause" }
        : null,
    message: "",
  },
  {
    name: "no-effect-serviceoption",
    test: (line, idx): LintViolation | null =>
      /Effect\.serviceOption\(/.test(line)
        ? { file: "", line: idx + 1, message: "Effect.serviceOption allows optional services. Services must always be present.", rule: "no-effect-serviceoption" }
        : null,
    message: "",
  },
  {
    name: "no-disable-validation",
    test: (line, idx): LintViolation | null =>
      /disableValidation\s*:\s*true/.test(line)
        ? { file: "", line: idx + 1, message: "{ disableValidation: true } bypasses schema validation.", rule: "no-disable-validation" }
        : null,
    message: "",
  },
  {
    name: "no-void-expression",
    test: (line, idx): LintViolation | null => {
      const trimmed = line.trim()
      if (/^void\s+(Effect\.|pipe\()/.test(trimmed)) {
        return { file: "", line: idx + 1, message: "void expression as a statement is a no-op. Remove it or use explicit handling.", rule: "no-void-expression" }
      }
      return null
    },
    message: "",
  },
  {
    name: "no-nested-layer-provide",
    test: (line, idx, lines): LintViolation | null => {
      if (/Layer\.provide\(/.test(line) || /Layer\.provideMerge\(/.test(line)) {
        for (let i = Math.max(0, idx - 5); i < idx; i++) {
          if (/Layer\.provide\(/.test(lines[i]) || /Layer\.provideMerge\(/.test(lines[i])) {
            return { file: "", line: idx + 1, message: "Nested Layer.provide — compose layers at the edge, not inline.", rule: "no-nested-layer-provide" }
          }
        }
      }
      return null
    },
    message: "",
  },
]

const sourceDirs = [
  "packages",
  "apps",
]

function findSourceFiles(root: string, maxDepth = 3): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(root, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(root, entry.name)
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "dist-electron") continue
      if (entry.name.startsWith(".")) continue
      if (entry.isDirectory() && maxDepth > 0) {
        results.push(...findSourceFiles(fullPath, maxDepth - 1))
      } else if (entry.isFile() && (extname(entry.name) === ".ts" || extname(entry.name) === ".tsx")) {
        results.push(fullPath)
      }
    }
  } catch { }
  return results
}

function lintFile(filePath: string): LintViolation[] {
  const violations: LintViolation[] = []
  try {
    const content = readFileSync(filePath, "utf8")
    const lines = content.split("\n")
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue
      for (const rule of rules) {
        const result = rule.test(line, i, lines)
        if (result) {
          result.file = filePath
          violations.push(result)
        }
      }
    }
  } catch { }
  return violations
}

function main(): number {
  const allFiles: string[] = []
  for (const dir of sourceDirs) {
    allFiles.push(...findSourceFiles(dir))
  }

  let totalViolations = 0
  for (const file of allFiles) {
    const violations = lintFile(file)
    if (violations.length > 0) {
      for (const v of violations) {
        const relative = join(process.cwd(), file)
        console.error(`  ${relative}:${v.line}`)
        console.error(`  ${v.rule}: ${v.message}`)
        totalViolations++
      }
    }
  }

  if (totalViolations > 0) {
    console.error(`\neffect-lint: ${totalViolations} violation(s) found.`)
    return 1
  }

  console.log("effect-lint: no violations found.")
  return 0
}

process.exitCode = main()