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
import { fileURLToPath } from "node:url";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, extname } from "node:path"
import type { CallExpression, ImportDeclaration, Node, SourceFile } from "typescript/unstable/ast"
import {
  isCallExpression,
  isExpressionStatement,
  isIdentifier,
  isImportDeclaration,
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

// ---------------------------------------------------------------------------
// Renderer dependency-boundary rules (Stage 1 — keyboard-first renderer).
//
// Career screens import ONLY `renderer/rpc`; they may not reach `window.cmClone.call`,
// `@effect/atom-react`, or `effect/unstable/reactivity` directly. The seam (`rpc.ts` +
// `rpc/*`) is the single exception. Fixtures under `scripts/effect-lint-fixtures/` stand in for
// renderer files and MUST trip these rules on every gate run, so the check cannot silently rot.
// ---------------------------------------------------------------------------

const RENDERER_DIR = join("apps", "desktop", "src", "renderer")
const FIXTURE_ROOT = join("scripts", "effect-lint-fixtures")

/** True when `node` is a call to exactly `window.cmClone.call`. */
function isWindowCmCloneCall(node: Node): boolean {
  if (!isCallExpression(node)) return false
  const callee = node.expression
  if (!isPropertyAccessExpression(callee)) return false
  const target = callee.expression
  return (
    isPropertyAccessExpression(target) &&
    isIdentifier(target.expression) &&
    target.expression.text === "window" &&
    target.name.text === "cmClone" &&
    isIdentifier(callee.name) &&
    callee.name.text === "call"
  )
}

export type BoundaryViolationKind = "direct-preload-call" | "direct-module-import"

export interface BoundaryViolation {
  readonly kind: BoundaryViolationKind
  readonly block: string
  readonly message: string
}

/**
 * The dependency-boundary violations a career screen would commit. Returns `null` for a file
 * that is not under the renderer (or is the seam itself).
 */
export function lintBoundary(sourceFile: SourceFile, filePath: string): LintViolation[] {
  const out: LintViolation[] = []
  const visit = (node: Node): void => {
    if (isWindowCmCloneCall(node)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
      out.push({
        file: filePath,
        line: line + 1,
        rule: "renderer-boundary",
        message: "Career screens must not call window.cmClone.call directly — import RPC through renderer/rpc.",
      })
    }
    if (isImportDeclaration(node)) {
      const specifier = (node as ImportDeclaration).moduleSpecifier as Node & { text?: string }
      if (isStringLiteral(specifier) && (specifier.text === "@effect/atom-react" || specifier.text === "effect/unstable/reactivity")) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
        out.push({
          file: filePath,
          line: line + 1,
          rule: "renderer-boundary",
          message: `Career screens must not import ${specifier.text} directly — import it through renderer/rpc.`,
        })
      }
    }
    node.forEachChild(visit)
  }
  visit(sourceFile)
  out.sort((a, b) => a.line - b.line)
  return out
}

/** True when the file must go through the RPC seam: renderer files outside `rpc.ts`/`rpc/`, and fixtures. */
export function isBoundaryEnforced(filePath: string): boolean {
  if (filePath.includes(FIXTURE_ROOT)) return true
  if (!filePath.includes(RENDERER_DIR)) return false
  const rel = filePath.slice(filePath.indexOf(RENDERER_DIR) + RENDERER_DIR.length).replace(/\\/g, "/")
  return !rel.startsWith("/rpc.") && !rel.startsWith("/rpc/")
}

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

function findFixtureFiles(cwd: string): string[] {
  return findSourceFiles(join(cwd, FIXTURE_ROOT))
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

/** Every fixture must trip at least one renderer-boundary violation, on pain of the gate failing. */
function assertBoundaryCoverage(found: Array<{ file: string; violations: LintViolation[] }>): void {
  for (const entry of found) {
    const hits = entry.violations.filter((v) => v.rule === "renderer-boundary")
    if (hits.length === 0) {
      throw new Error(
        `effect-lint: boundary fixture ${entry.file} did NOT trip any renderer-boundary rule. ` +
          "If the seam boundary moved, update the fixture before relaxing the rule.",
      )
    }
  }
}

export interface LintFileSetResult {
  readonly treeViolations: LintViolation[]
  readonly fixtureBoundaries: Array<{ file: string; violations: LintViolation[] }>
}

/**
 * Lint an explicit set of file paths (absolute). Kept separate from `main` so tests can drive
 * the exact same rules against fixtures and real files without re-implementing the harness.
 */
export function lintFileSet(cwd: string, files: string[]): LintFileSetResult {
  const fixtureFiles = files.filter((f) => f.includes(FIXTURE_ROOT))
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
      files,
    }),
  )

  const api = new API({ cwd })
  const treeViolations: LintViolation[] = []
  const fixtureBoundaries: Array<{ file: string; violations: LintViolation[] }> = []
  try {
    const project = api.updateSnapshot({ openProjects: [configPath] }).getProjects()[0]
    if (!project) {
      throw new Error("effect-lint: TypeScript API returned no project for the synthetic config.")
    }
    const parseErrors = project.program.getSyntacticDiagnostics()
    if (parseErrors.length > 0) {
      const first = parseErrors[0]!
      throw new Error(
        `effect-lint: ${parseErrors.length} parse error(s); refusing to pass. First: ${first.file?.fileName ?? "<unknown>"} — ${String(first.messageText)}`,
      )
    }
    for (const file of files) {
      const sourceFile = project.program.getSourceFile(file)
      if (!sourceFile) {
        throw new Error(`effect-lint: TypeScript could not parse ${file}; refusing to pass.`)
      }
      const standard = lintSourceFile(sourceFile, file)
      const boundary = isBoundaryEnforced(file) ? lintBoundary(sourceFile, file) : []
      if (fixtureFiles.includes(file)) {
        fixtureBoundaries.push({ file, violations: [...standard, ...boundary] })
      } else {
        treeViolations.push(...standard, ...boundary)
      }
    }
  } finally {
    api.close()
    rmSync(scratchDir, { force: true, recursive: true })
  }
  treeViolations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
  return { treeViolations, fixtureBoundaries }
}

export function main(): number {
  const cwd = process.cwd()
  const allFiles: string[] = []
  for (const dir of sourceDirs) {
    allFiles.push(...findSourceFiles(join(cwd, dir)))
  }
  const fixtureFiles = findFixtureFiles(cwd)
  const { treeViolations, fixtureBoundaries } = lintFileSet(cwd, [...allFiles, ...fixtureFiles])

  for (const violation of treeViolations) {
    console.error(`  ${violation.file}:${violation.line}`)
    console.error(`  ${violation.rule}: ${violation.message}`)
  }

  // The fixtures must keep tripping the boundary rules — a rule that stops firing is a rule
  // nobody needs, and nobody notices until it is too late.
  assertBoundaryCoverage(fixtureBoundaries)

  if (treeViolations.length > 0) {
    console.error(`\neffect-lint: ${treeViolations.length} violation(s) found.`)
    return 1
  }

  console.log(`effect-lint: no violations found (${allFiles.length} files).`)
  return 0
}

const isMain = process.argv.length > 1 && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) process.exitCode = main()