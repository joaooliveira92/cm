/**
 * Custom Effect anti-pattern linter.
 *
 * Rules run against a real TypeScript AST, not against raw lines: a rule name mentioned in a
 * comment or a string literal is not a violation, and an expression split across several lines
 * is still one node. Parsing goes through the TypeScript 7 API (`typescript/unstable/*`), which
 * has no in-process `createSourceFile`; instead we hand the server a synthetic project whose
 * `files` list is exactly the set of files we discovered on disk, so lint coverage and disk
 * coverage cannot drift apart.
 */
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, extname } from "node:path"
import type { CallExpression, Node, SourceFile } from "typescript/unstable/ast"
import {
  isCallExpression,
  isExpressionStatement,
  isIdentifier,
  isObjectLiteralExpression,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isSpreadAssignment,
  isStringLiteral,
  isTrueLiteral,
  isVoidExpression,
} from "typescript/unstable/ast/is"
import { API } from "typescript/unstable/sync"

interface LintViolation {
  file: string
  line: number
  message: string
  rule: string
}

interface Rule {
  name: string
  message: string
  /** Returns the node to report, or null when the rule does not apply to this node. */
  test: (node: Node) => Node | null
}

/** True when `node` is a call whose callee is exactly `<namespace>.<member>(…)`. */
function isNamespaceCall(node: Node, namespace: string, member: string): boolean {
  if (!isCallExpression(node)) return false
  const callee = node.expression
  return (
    isPropertyAccessExpression(callee) &&
    isIdentifier(callee.expression) &&
    callee.expression.text === namespace &&
    callee.name.text === member
  )
}

function namespaceCallRule(name: string, namespace: string, member: string, message: string): Rule {
  return {
    name,
    message,
    test: (node) => (isNamespaceCall(node, namespace, member) ? node : null),
  }
}

/** The name of an object literal member, when it is a plain identifier or string key. */
function propertyKeyName(node: Node): string | undefined {
  const name = (node as { name?: Node }).name
  if (!name) return undefined
  if (isIdentifier(name) || isStringLiteral(name)) return name.text
  return undefined
}

/** True when the last argument is an options object that names `concurrency`. */
function hasExplicitConcurrency(call: CallExpression): boolean {
  const args = call.arguments
  const last = args.length > 0 ? args[args.length - 1] : undefined
  if (!last || !isObjectLiteralExpression(last)) return false
  return last.properties.some((property) => {
    // A spread could carry `concurrency`; we cannot see inside it, so treat it as deliberate.
    if (isSpreadAssignment(property)) return true
    return propertyKeyName(property) === "concurrency"
  })
}

const rules: Rule[] = [
  namespaceCallRule(
    "no-effect-ignore",
    "Effect",
    "ignore",
    "Effect.ignore silently discards errors. Use Effect.orDie or explicit error handling.",
  ),
  namespaceCallRule(
    "no-effect-asvoid",
    "Effect",
    "asVoid",
    "Effect.asVoid is unnecessarily restrictive. Use Effect.void instead.",
  ),
  namespaceCallRule(
    "no-effect-catchallcause",
    "Effect",
    "catchAllCause",
    "Effect.catchAllCause catches defects/bugs. Use Effect.catchAll or Effect.catchTag instead.",
  ),
  namespaceCallRule(
    "no-effect-serviceoption",
    "Effect",
    "serviceOption",
    "Effect.serviceOption allows optional services. Services must always be present.",
  ),
  {
    name: "no-disable-validation",
    message: "{ disableValidation: true } bypasses schema validation.",
    test: (node) => {
      if (!isPropertyAssignment(node)) return null
      if (propertyKeyName(node) !== "disableValidation") return null
      return isTrueLiteral(node.initializer) ? node : null
    },
  },
  {
    name: "no-void-expression",
    message: "void expression as a statement is a no-op. Remove it or use explicit handling.",
    test: (node) => {
      if (!isExpressionStatement(node)) return null
      const expression = node.expression
      if (!isVoidExpression(expression)) return null
      // Mirror the old `void Effect.…` / `void pipe(…)` shapes: find the head of the operand.
      let head: Node = expression.expression
      if (isCallExpression(head)) head = head.expression
      while (isPropertyAccessExpression(head)) head = head.expression
      if (!isIdentifier(head)) return null
      return head.text === "Effect" || head.text === "pipe" ? node : null
    },
  },
  {
    name: "no-nested-layer-provide",
    message: "Nested Layer.provide — compose layers at the edge, not inline.",
    test: (node) => {
      const isProvide = (candidate: Node): boolean =>
        isNamespaceCall(candidate, "Layer", "provide") ||
        isNamespaceCall(candidate, "Layer", "provideMerge")
      if (!isProvide(node)) return null
      for (let parent: Node | undefined = node.parent; parent; parent = parent.parent) {
        if (isProvide(parent)) return node
      }
      return null
    },
  },
  {
    name: "require-explicit-concurrency",
    message:
      "Effect.all/Effect.forEach default to SEQUENTIAL execution — the most common cause of accidentally slow Effect code. Pass an explicit options object; `{ concurrency: 1 }` is a fine answer, but it must be a choice.",
    test: (node) => {
      if (!isNamespaceCall(node, "Effect", "all") && !isNamespaceCall(node, "Effect", "forEach")) {
        return null
      }
      return hasExplicitConcurrency(node as CallExpression) ? null : node
    },
  },
]

const sourceDirs = ["packages", "apps"]

/**
 * Every `.ts`/`.tsx` file under `root`, at any depth. A file that exists is a file that gets
 * linted; there is deliberately no depth cap to silently drop deeply nested directories.
 */
function findSourceFiles(root: string): string[] {
  const results: string[] = []
  let entries: ReturnType<typeof readdirSync<{ withFileTypes: true }>>
  try {
    entries = readdirSync(root, { withFileTypes: true })
  } catch (error) {
    throw new Error(`effect-lint: cannot read directory ${root}: ${String(error)}`)
  }
  for (const entry of entries) {
    const fullPath = join(root, entry.name)
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "dist-electron") {
      continue
    }
    if (entry.name.startsWith(".")) continue
    if (entry.isDirectory()) {
      results.push(...findSourceFiles(fullPath))
    } else if (entry.isFile() && (extname(entry.name) === ".ts" || extname(entry.name) === ".tsx")) {
      results.push(fullPath)
    }
  }
  return results
}

function lintSourceFile(sourceFile: SourceFile, filePath: string): LintViolation[] {
  const violations: LintViolation[] = []
  const visit = (node: Node): void => {
    for (const rule of rules) {
      const hit = rule.test(node)
      if (hit) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(hit.getStart(sourceFile))
        violations.push({ file: filePath, line: line + 1, message: rule.message, rule: rule.name })
      }
    }
    node.forEachChild(visit)
  }
  visit(sourceFile)
  violations.sort((a, b) => a.line - b.line)
  return violations
}

function main(): number {
  const cwd = process.cwd()
  const allFiles: string[] = []
  for (const dir of sourceDirs) {
    allFiles.push(...findSourceFiles(join(cwd, dir)))
  }

  // A synthetic project pinned to exactly the discovered files. `noResolve`/`noLib` keep this a
  // parse-only pass: we never ask for semantic diagnostics, so imports need not resolve.
  const scratchDir = mkdtempSync(join(tmpdir(), "effect-lint-"))
  const configPath = join(scratchDir, "tsconfig.json")
  writeFileSync(
    configPath,
    JSON.stringify({
      compilerOptions: {
        allowJs: false,
        jsx: "preserve",
        module: "esnext",
        noEmit: true,
        noLib: true,
        noResolve: true,
        target: "esnext",
        types: [],
      },
      files: allFiles,
    }),
  )

  const api = new API({ cwd })
  let totalViolations = 0
  try {
    const project = api.updateSnapshot({ openProjects: [configPath] }).getProjects()[0]
    if (!project) {
      throw new Error("effect-lint: TypeScript API returned no project for the synthetic config.")
    }

    // A file that does not parse would otherwise lint clean — fail loudly instead.
    const parseErrors = project.program.getSyntacticDiagnostics()
    if (parseErrors.length > 0) {
      const first = parseErrors[0]!
      throw new Error(
        `effect-lint: ${parseErrors.length} parse error(s); refusing to pass. First: ${first.file?.fileName ?? "<unknown>"} — ${String(first.messageText)}`,
      )
    }

    for (const file of allFiles) {
      const sourceFile = project.program.getSourceFile(file)
      if (!sourceFile) {
        throw new Error(`effect-lint: TypeScript could not parse ${file}; refusing to pass.`)
      }
      for (const violation of lintSourceFile(sourceFile, file)) {
        console.error(`  ${violation.file}:${violation.line}`)
        console.error(`  ${violation.rule}: ${violation.message}`)
        totalViolations++
      }
    }
  } finally {
    api.close()
    rmSync(scratchDir, { force: true, recursive: true })
  }

  if (totalViolations > 0) {
    console.error(`\neffect-lint: ${totalViolations} violation(s) found.`)
    return 1
  }

  console.log(`effect-lint: no violations found (${allFiles.length} files).`)
  return 0
}

process.exitCode = main()
