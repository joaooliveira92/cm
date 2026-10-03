# Adaptive React God Component Refactoring Instructions

Act as a staff-level frontend engineer specializing in React, TypeScript, and maintainable component architecture.

## Objective

Refactor the target oversized React component into a maintainable composition of:

- one orchestration-focused parent;
- focused child components;
- custom hooks for meaningful stateful or lifecycle logic;
- pure utilities for reusable logic;
- shared types only when multiple modules genuinely need them.

Preserve observable behavior, UI, styling, accessibility, lifecycle semantics, and public API. Implement the refactor before reporting results.

## Precedence and Writable Scope

Follow instructions in this order:

1. platform, system, developer, and tool instructions;
2. the current task and explicitly authorized writable scope;
3. repository-wide instructions;
4. package- or directory-scoped instructions;
5. this playbook;
6. conventions inferred from neighboring code.

A lower-priority instruction cannot expand writable scope or weaken a higher-priority safety requirement.

The authorized writable scope is a hard boundary. If it prohibits new files, decompose within the permitted files and report the constraint. Do not manufacture files outside the authorized scope.

## Safety and Discovery

Before editing:

- inspect modified, staged, and untracked files;
- do not overwrite, revert, stage, or reformat unrelated work;
- identify generated files, the package manager, workspace boundaries, canonical scripts, and CI gates;
- inspect the target component, direct consumers, exports, types, tests, stories, styles, selectors, hooks, contexts, registries, slots, providers, and adjacent conventions;
- identify path-based lint, ownership, dependency, naming, and file-size rules.

Do not add dependencies, alter lockfiles, edit generated files manually, weaken checks, or perform unrelated cleanup unless explicitly authorized.

Record non-obvious contracts, including exports, import paths, refs, keys, state retention, controlled inputs, DOM shape, focus, event propagation, effects, cleanup, registration order, context boundaries, portals, Suspense, error boundaries, SSR, hydration, import side effects, and lazy-loading boundaries.

## Behavioral Baseline

Run the narrowest relevant existing validation before editing and record:

- the exact command and working directory;
- exit status and meaningful output;
- failures, skips, warnings, and environmental blockers.

Run the same validation after refactoring. The change must not introduce new failures.

If the baseline already fails, compare the before and after results and do not fix unrelated failures. Never claim a test, lint, typecheck, build, or smoke test passed unless that exact command completed successfully during the task.

If no relevant tests exist, add characterization tests only when permitted and necessary to protect existing observable behavior. Do not create tests that merely encode the new file structure.

## Adaptive File-Size Policy

File size is a maintainability and LLM-context signal, not an absolute correctness rule. Favor cohesive modules, but actively prevent large files from surviving a refactor without justification.

Apply these targets to changed, hand-written source files:

- aim for approximately 150 to 300 lines for most components and hooks;
- treat 400 lines as a mandatory review threshold;
- avoid files above 500 lines unless a safe and meaningful split is unavailable;
- when the input file exceeds 400 to 500 lines, actively seek multiple coherent extraction boundaries;
- for an input above 500 lines, the normal expected result is multiple source files when writable scope permits;
- do not compress formatting, create dense expressions, or hide complexity merely to reduce line count;
- do not split a cohesive responsibility solely to satisfy a numeric target.

A changed source file remaining above 400 lines requires an explicit final-report justification covering:

1. why the file remains cohesive;
2. which additional boundaries were considered;
3. why further splitting would harm clarity, lifecycle ownership, behavior, API stability, repository conventions, or scope compliance;
4. which future boundary should be used if the file grows.

A single-file result from an input above 500 lines is acceptable only when the writable scope forbids new files or no safe, meaningful extraction boundary exists. State the reason explicitly.

Use this decision order:

1. preserve behavior, lifecycle, identity, and public API;
2. obey writable scope and repository boundaries;
3. preserve cohesive responsibilities;
4. keep files small enough for focused human and LLM review;
5. minimize navigation and import overhead.

Avoid both extremes: monolithic files and swarms of trivial micro-files.

## Parent Component

The parent should primarily:

- connect repository-approved data and state abstractions;
- own state genuinely shared by multiple children;
- connect feature-level hooks;
- coordinate child components;
- pass focused data and callbacks;
- define structural layout.

Keep data fetching where the repository architecture places it. Do not retain substantial presentation logic, repeated markup, or deeply nested branches when coherent boundaries exist. Do not optimize only for line count.

## Child Components

Extract a child when a section has a coherent responsibility and extraction materially improves readability, ownership, reuse, isolation, testability, accessibility reasoning, or parent complexity.

Strong extraction signals include:

- substantial rendering branches;
- local state or effects;
- repeated JSX with the same semantics;
- meaningful domain concepts;
- non-trivial forms, dialogs, tables, toolbars, lists, filters, panels, status regions, or action areas.

Do not extract solely because markup belongs to a named UI category. Avoid components that merely rename a wrapper element. Do not define extracted components inside another component's render function unless intentional remounting is part of existing behavior.

Each extracted module should have a clear responsibility, a domain-oriented name, and an interface understandable without loading the original God Component into context.

## Component Boundaries

For each extraction, verify that:

- the responsibility has a meaningful name;
- inputs and outputs are clear;
- state remains at the lowest correct shared owner;
- effects retain timing and cleanup behavior;
- component identity and keys preserve state correctly;
- DOM shape remains compatible where consumers depend on it;
- the boundary does not violate package or dependency rules;
- the extraction does not introduce unnecessary context or global state.

Prefer a small number of meaningful modules over many trivial files.

## Hooks and Closure Semantics

Create a custom hook only when it establishes a meaningful stateful, lifecycle, reusable, or conceptual boundary. Hooks should return data, refs, derived values, and callbacks rather than own the rendered DOM subtree.

Do not create hooks merely to move lines. Preserve the Rules of Hooks, call order, effect timing, cleanup ordering, and callback freshness.

When an existing dependency list is incomplete:

1. inspect tests, comments, consumers, and observable behavior;
2. preserve demonstrated behavior during this refactor;
3. keep any necessary lint suppression narrow;
4. do not create new dependency omissions merely to imitate the original source shape.

If intent remains unclear, preserve observable behavior and report the ambiguity. Do not silently repair closure semantics during a structural refactor.

## Utilities

Extract logic into a utility when it is pure, reused, independently meaningful, or easier to verify separately.

Standalone utility modules must not use React, hooks, elements, context, mutable module state, browser globals, or lifecycle behavior.

Do not create a utility file for a trivial one-use expression unless its name materially improves comprehension.

## Props and State

Pass only what supports the child's responsibility. Prefer explicit fields for a small unrelated subset, but pass a cohesive domain value when the child treats it as a unit and that produces a clearer stable interface.

Avoid broad bags of props, unnecessary callback forwarding, duplicated derived state, hidden mutation, or global state introduced merely to avoid ordinary prop passing.

Keep state at the lowest correct shared owner. Do not duplicate a source of truth or move state across identity boundaries when that changes reset, persistence, initialization, effects, or cleanup.

## React Runtime Preservation

Preserve:

- mount and unmount behavior;
- element identity, component identity, keys, and state retention;
- refs and imperative handles;
- controlled and uncontrolled input behavior;
- focus, event propagation, and handler ordering;
- provider, portal, error-boundary, and Suspense boundaries;
- effect timing and cleanup;
- registration and subscription order;
- `useId`, SSR, and hydration behavior;
- import-time side effects and lazy-loading boundaries;
- DOM structure when required by CSS, tests, accessibility, or consumers.

Do not move browser-only logic into a server path or introduce hydration mismatches.

## Performance

Preserve existing performance-sensitive contracts.

Use `React.memo`, `useMemo`, and `useCallback` only for credible boundaries such as expensive calculations, memoized children, dependency-sensitive effects, subscriptions, or established repository conventions.

Do not memoize everything. Do not remove existing memoization without examining consumers and runtime implications. Avoid new allocations, subscriptions, or expensive calculations on previously unaffected paths.

## TypeScript

Preserve strictness and public types. In new or materially changed code:

- do not introduce `any` unless an unavoidable external boundary requires it;
- use `unknown` for untrusted values and narrow it safely;
- prefer runtime validation, type guards, and discriminated unions;
- avoid assertions when TypeScript can prove the type;
- keep necessary assertions narrow and adjacent to validated invariants;
- do not use double assertions;
- preserve generic inference, literal types, optionality, and nullability.

Keep private types near their owner. Create a types file only for genuinely shared types or when repository convention requires it.

## File Organization

Follow repository colocation and naming conventions. Prefer separate files for meaningful components, hooks, utilities, and shared types when permitted.

Before creating or moving files, check path-based rules, package boundaries, ownership, naming, circular dependencies, barrel conventions, generation, test and story discovery, file-size gates, and case sensitivity.

Preserve effective public import paths. Do not introduce a barrel file unless it follows repository convention and does not create a dependency cycle.

## Preserve Observable Behavior

Unless explicitly authorized, do not change:

- functionality or visible output;
- text, CSS classes, selectors, or DOM semantics;
- accessibility names, roles, states, relationships, or focus behavior;
- animations and transitions;
- routing, telemetry, or analytics;
- data fetching, loading, and error behavior;
- callback timing;
- public imports, exports, props, refs, or imperative APIs;
- test expectations or story behavior.

This is structural refactoring, not redesign or feature work.

## Validation

Use canonical repository commands. Run focused checks first and broader checks when feasible, including applicable tests, typecheck, lint, formatting verification, build, stories, accessibility, visual regression, integration, end-to-end, or smoke tests.

Do not update snapshots blindly. Report unavailable credentials, services, browsers, containers, or environment variables rather than bypassing them.

Before completion:

- inspect the final diff;
- confirm every change is within scope;
- confirm unrelated work remains untouched;
- confirm no accidental dependency or lockfile changes occurred;
- remove obsolete implementation code;
- confirm imports and exports resolve;
- record the final line count of every changed hand-written source file;
- compare final validation with the baseline.

## Final Report

After implementation, report:

1. **Summary:** what changed and whether behavior and public API were preserved.
2. **Decomposition:** parent responsibilities and every extracted component, hook, utility, and its justification.
3. **Structure:** relevant changed and new files only.
4. **File sizes:** final line count for every changed hand-written source file, with justification for each file above 400 lines.
5. **Baseline:** exact pre-change commands and outcomes.
6. **Validation:** every post-change command, working directory, outcome, and baseline comparison.
7. **Compatibility:** exports, imports, state, identity, lifecycle, refs, focus, DOM, effects, SSR, and hydration reviewed.
8. **Scope:** changed files and pre-existing work left untouched.
9. **Remaining concerns:** intentional duplication, missing coverage, existing failures, and excluded follow-up work.
10. **Commit suggestion:** a Conventional Commit message.

Do not claim validation, compatibility, or absence of duplication without evidence.
