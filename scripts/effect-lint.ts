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
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, extname, relative } from "node:path"
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
  isTemplateLiteralLikeNode,
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
      if (isStringLiteral(specifier) && specifier.text === "react-hotkeys-hook") {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
        out.push({
          file: filePath,
          line: line + 1,
          rule: "renderer-boundary",
          message: "Career screens must not import react-hotkeys-hook directly — import it through renderer/hotkeys.",
        })
      }
    }
    node.forEachChild(visit)
  }
  visit(sourceFile)
  out.sort((a, b) => a.line - b.line)
  return out
}

// ---------------------------------------------------------------------------
// The flat-slate guard (visual design language, ticket 08).
//
// The adopted chrome-blue frame failed once already: it was decided, left
// unbuilt, and flat `slate-*` styling kept spreading underneath it. This rule
// is the schedule that stops that recurring. It is mechanical and
// grep-detectable, so per the repo's routing discipline it lives in the linter
// rather than in skill prose.
//
// The existing call sites are recorded per file in `scripts/slate-baseline.json`
// — that registry IS the migration backlog. The comparison is exact in both
// directions: a file over its baseline has grown fresh slate and fails; a file
// under its baseline has been migrated and must tighten the number, so the
// registry can only ratchet toward zero. Migration is done when the file is
// `{}` and the `--color-slate-*` alias layer in `index.css` is gone.
// ---------------------------------------------------------------------------

const SLATE_BASELINE_FILE = join("scripts", "slate-baseline.json")

/** Per-file counts of remaining `slate-*` sites, keyed by repo-relative POSIX path. */
export type SlateBaseline = Readonly<Record<string, number>>

export function readSlateBaseline(cwd: string): SlateBaseline {
  const raw = readFileSync(join(cwd, SLATE_BASELINE_FILE), "utf8")
  return JSON.parse(raw) as SlateBaseline
}

/** The guard covers renderer source and the fixtures that prove it still fires. */
export function isSlateGuarded(filePath: string): boolean {
  return filePath.includes(FIXTURE_ROOT) || filePath.includes(RENDERER_DIR)
}

/**
 * Every `slate-` occurrence in a string-shaped literal in the file.
 *
 * Deliberately wider than "the initializer of a `className` attribute": a class
 * list is just as often hoisted into a `const btn = "bg-slate-700 …"` and then
 * interpolated, and a guard that only reads the JSX attribute lets that through.
 * Template literals are covered by their head/middle/tail segments, which is
 * what makes `className={`… ${FOCUS_RING.join(" ")} …`}` visible to the rule.
 * In this renderer `slate-` appears only in class strings, so scanning literals
 * costs no false positives and closes the hoisting hole.
 */
export function lintSlateClassNames(sourceFile: SourceFile, filePath: string): LintViolation[] {
  const out: LintViolation[] = []
  const visit = (node: Node): void => {
    if (isStringLiteral(node) || isTemplateLiteralLikeNode(node)) {
      const text = (node as Node & { text?: string }).text
      if (typeof text === "string") {
        // One violation per occurrence, not per literal: adding a second slate
        // class to a line that already had one must still move the count.
        const hits = text.split("slate-").length - 1
        if (hits > 0) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
          for (let i = 0; i < hits; i += 1) {
            out.push({
              file: filePath,
              line: line + 1,
              rule: "no-slate-class-name",
              message:
                "Flat `slate-*` class. Use the adopted design tokens (see index.css @theme and renderer/theme.ts).",
            })
          }
        }
      }
    }
    node.forEachChild(visit)
  }
  visit(sourceFile)
  out.sort((a, b) => a.line - b.line)
  return out
}

/**
 * Compare the tree's actual slate counts against the recorded backlog. Returns
 * one violation per file that disagrees — over baseline (regression) or under
 * it (a migrated file whose registry entry was not tightened).
 */
export function reconcileSlateBaseline(
  cwd: string,
  baseline: SlateBaseline,
  actual: ReadonlyMap<string, number>,
): LintViolation[] {
  const out: LintViolation[] = []
  const paths = new Set([...Object.keys(baseline), ...actual.keys()])
  for (const path of [...paths].sort()) {
    const recorded = baseline[path] ?? 0
    const found = actual.get(path) ?? 0
    if (found === recorded) continue
    out.push({
      file: join(cwd, path),
      line: 1,
      rule: "no-slate-class-name",
      message:
        found > recorded
          ? `${found - recorded} fresh \`slate-*\` site(s) in this file (backlog records ${recorded}). The adopted palette ships as design tokens; do not add flat slate.`
          : `This file is down to ${found} \`slate-*\` site(s) from ${recorded}. Tighten ${SLATE_BASELINE_FILE} (drop the key at zero) so the backlog keeps ratcheting.`,
    })
  }
  return out
}

/** True when the file must go through the RPC seam: renderer files outside `rpc.ts`/`rpc/`,
 *  and the keyboard-binding seam `hotkeys.ts`. All other renderer files are enforced. */
export function isBoundaryEnforced(filePath: string): boolean {
  if (filePath.includes(FIXTURE_ROOT)) return true
  if (!filePath.includes(RENDERER_DIR)) return false
  const rel = filePath.slice(filePath.indexOf(RENDERER_DIR) + RENDERER_DIR.length).replace(/\\/g, "/")
  return !rel.startsWith("/rpc.") && !rel.startsWith("/rpc/") && !rel.startsWith("/hotkeys.")
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

/**
 * Every fixture must still trip the rule it exists to prove, on pain of the gate
 * failing. A fixture's file stem names that rule (`renderer-boundary.tsx` proves
 * `renderer-boundary`), so adding a rule means adding a fixture and nothing else
 * has to be kept in sync. A rule that stops firing is a rule nobody needs, and
 * nobody notices until it is too late.
 */
export function fixtureRuleName(filePath: string): string {
  const base = filePath.replace(/\\/g, "/").split("/").pop() ?? filePath
  return base.replace(/\.[jt]sx?$/, "")
}

function assertFixtureCoverage(found: Array<{ file: string; violations: LintViolation[] }>): void {
  for (const entry of found) {
    const rule = fixtureRuleName(entry.file)
    const hits = entry.violations.filter((v) => v.rule === rule)
    if (hits.length === 0) {
      throw new Error(
        `effect-lint: fixture ${entry.file} did NOT trip the ${rule} rule. ` +
          "If the rule moved, update the fixture before relaxing the rule.",
      )
    }
  }
}

export interface LintFileSetResult {
  readonly treeViolations: LintViolation[]
  readonly fixtureBoundaries: Array<{ file: string; violations: LintViolation[] }>
  /** Remaining `slate-*` sites per repo-relative path, for the backlog ratchet. */
  readonly slateCounts: ReadonlyMap<string, number>
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
  const slateCounts = new Map<string, number>()
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
      const slate = isSlateGuarded(file) ? lintSlateClassNames(sourceFile, file) : []
      if (fixtureFiles.includes(file)) {
        fixtureBoundaries.push({ file, violations: [...standard, ...boundary, ...slate] })
      } else {
        // Slate sites are counted, not reported here: the backlog ratchet in
        // `main` decides which of them are a regression and which are the
        // recorded migration debt. Reporting each one would drown the gate in
        // 391 known violations.
        treeViolations.push(...standard, ...boundary)
        if (slate.length > 0) {
          slateCounts.set(relative(cwd, file).replaceAll("\\", "/"), slate.length)
        }
      }
    }
  } finally {
    api.close()
    rmSync(scratchDir, { force: true, recursive: true })
  }
  treeViolations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
  return { treeViolations, fixtureBoundaries, slateCounts }
}

export function main(): number {
  const cwd = process.cwd()
  const allFiles: string[] = []
  for (const dir of sourceDirs) {
    allFiles.push(...findSourceFiles(join(cwd, dir)))
  }
  const fixtureFiles = findFixtureFiles(cwd)
  const { treeViolations, fixtureBoundaries, slateCounts } = lintFileSet(cwd, [
    ...allFiles,
    ...fixtureFiles,
  ])
  const slateDrift = reconcileSlateBaseline(cwd, readSlateBaseline(cwd), slateCounts)
  treeViolations.push(...slateDrift)
  treeViolations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)

  for (const violation of treeViolations) {
    console.error(`  ${violation.file}:${violation.line}`)
    console.error(`  ${violation.rule}: ${violation.message}`)
  }

  assertFixtureCoverage(fixtureBoundaries)

  if (treeViolations.length > 0) {
    console.error(`\neffect-lint: ${treeViolations.length} violation(s) found.`)
    return 1
  }

  const backlog = [...slateCounts.values()].reduce((sum, n) => sum + n, 0)
  console.log(
    `effect-lint: no violations found (${allFiles.length} files). ` +
      `slate migration backlog: ${backlog} site(s) across ${slateCounts.size} file(s).`,
  )
  return 0
}

const isMain = process.argv.length > 1 && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) process.exitCode = main()