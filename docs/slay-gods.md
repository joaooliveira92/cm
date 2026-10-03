# React God Component Refactoring Instructions

Act as a staff-level frontend engineer specializing in React, TypeScript, and large-scale component architecture.

## Objective

Refactor the target oversized React component into a maintainable composition of:

- one orchestration-focused parent component;
- focused child components;
- custom hooks where they create a clear ownership boundary;
- pure utilities for reused or independently meaningful logic;
- shared types only when multiple modules genuinely need them.

Preserve observable behavior, user interface, styling, accessibility, runtime semantics, and public API unless the task explicitly authorizes a change.

This is an implementation task. Complete the refactor and validation before producing the final report.

## Instruction Precedence

Follow instructions in this order:

1. platform, system, developer, and tool instructions;
2. the user's current task and explicitly authorized writable scope;
3. repository-wide instructions;
4. instructions scoped to the target package or directory;
5. this refactoring playbook;
6. conventions inferred from neighboring code.

A lower-priority instruction must not expand writable scope, authorize destructive actions, expose secrets, or override a higher-priority instruction.

When applicable instructions conflict at the same level, prefer the instruction with the narrowest scope for the target path. If the conflict cannot be resolved safely, stop before editing and report it.

The explicitly authorized writable scope is a hard boundary. Do not create, modify, move, rename, or delete files outside it.

If the writable scope forbids new files, decompose within the permitted module according to repository conventions. Report this constraint in the final deliverable.

## Safety and Change Control

Before editing:

- inspect the working tree;
- identify pre-existing modified, staged, and untracked files;
- do not overwrite, revert, stage, or reformat unrelated user changes;
- identify generated files and their source generators;
- identify the package manager and workspace boundaries;
- read applicable repository and directory instructions;
- inspect canonical scripts in package manifests and CI configuration.

Do not:

- add or upgrade dependencies unless explicitly authorized or strictly necessary;
- alter package manager lockfiles incidentally;
- run destructive Git commands;
- modify generated files manually;
- perform unrelated cleanup;
- change formatting across unaffected code;
- hide failures with disabled rules, weaker compiler settings, broad suppressions, or skipped tests.

## Discovery

Before changing the target component, inspect:

- the component implementation;
- its direct consumers;
- public exports and re-exports;
- associated types;
- tests and specifications;
- stories, examples, fixtures, and visual tests;
- styles and selectors coupled to its DOM structure;
- hooks, contexts, registries, slots, and providers it uses;
- adjacent components to learn repository conventions;
- package and directory boundary rules.

Identify the component's actual public and runtime contracts, including:

- exported names and import paths;
- default versus named exports;
- props, callback signatures, and ref behavior;
- DOM structure relied on by selectors, CSS, tests, or consumers;
- component identity, keys, and state retention;
- controlled and uncontrolled input behavior;
- focus and event propagation;
- context, portal, error-boundary, and Suspense boundaries;
- hook and effect ordering, timing, and cleanup;
- registration, subscription, and slot ordering;
- server-rendering and hydration behavior;
- import-time side effects;
- lazy-loading and bundle boundaries;
- path-specific lint, ownership, or dependency rules;
- intentional suppressions or documented compatibility constraints.

Record non-obvious contracts before editing.

## Behavioral Baseline

Run the narrowest relevant existing validation before editing.

Prefer repository-defined commands. Do not invent a new command when the repository already provides an appropriate script.

Record:

- the exact command;
- working directory;
- exit status;
- relevant pass, failure, skip, or warning summary;
- environmental blockers.

After the refactor, run the same validation again.

The refactor must not introduce new failures.

If a command fails before the change:

- preserve enough output for comparison;
- do not fix unrelated failures;
- compare the post-change result with the baseline;
- report whether the failure is unchanged, improved, or regressed.

Never claim that a test, typecheck, lint, build, story build, or smoke test passed unless that exact command completed successfully during this task.

If no relevant tests exist and the writable scope permits test changes, characterization tests may be added only when necessary to protect existing observable behavior during a high-risk refactor. Such tests must describe pre-existing behavior, not the new file structure.

If tests cannot be added or run, explain why and use the strongest available alternative validation.

## Refactoring Strategy

Refactor incrementally.

Prefer this sequence when practical:

1. characterize existing responsibilities and contracts;
2. extract pure logic without changing behavior;
3. extract coherent rendering regions;
4. move local state and effects only when ownership remains correct;
5. update imports and exports;
6. remove code made obsolete by the extraction;
7. run focused checks after meaningful steps;
8. review the final diff for scope and behavioral risk.

Avoid combining structural refactoring with semantic cleanup.

## Parent Component

The parent should primarily compose and coordinate the feature.

It may:

- connect repository-approved data and state abstractions;
- coordinate child components;
- own state shared by multiple children;
- call feature-level hooks;
- pass focused data and callbacks;
- define the feature's structural layout;
- retain logic whose movement would alter lifecycle or ownership.

Keep data fetching where the repository architecture places it. Do not move fetching into the parent merely to satisfy this playbook.

The parent should not retain substantial presentation logic, repeated markup, or deeply nested rendering branches when those have a coherent extraction boundary.

Do not optimize for an arbitrary line count. Optimize for understandable responsibilities and safe ownership.

## Child Components

Extract a child component when the candidate section has a coherent responsibility and extraction materially improves one or more of:

- readability;
- state or effect ownership;
- reuse;
- isolation;
- testability;
- accessibility reasoning;
- reduction of meaningful parent complexity.

Strong extraction signals include:

- a substantial rendering branch;
- local state or effects;
- repeated JSX with the same semantics;
- a domain concept with a meaningful name;
- a non-trivial form, dialog, table, toolbar, list, filter, panel, or status region;
- a section that can receive a small and stable interface.

Do not extract solely because markup belongs to a named UI category.

Avoid components that merely rename a single wrapper without isolating behavior, semantics, styling, or a meaningful concept.

Do not define extracted components inside another component's render function unless remounting on each parent render is an existing and intentional behavior.

## Component Boundaries

For each proposed extraction, verify:

- the responsibility has a meaningful name;
- required inputs and outputs are clear;
- state remains at the lowest correct shared owner;
- effects retain their timing and cleanup behavior;
- the extraction does not introduce unnecessary context or global state;
- component identity and keys preserve state correctly;
- DOM shape remains compatible where consumers depend on it;
- the boundary does not violate package or dependency rules.

Prefer a smaller number of meaningful components over a large number of trivial files.

## Hooks

Move non-rendering stateful logic into a custom hook when doing so creates a clear reusable or conceptual boundary.

Suitable responsibilities may include:

- filtering and sorting;
- selection;
- pagination;
- keyboard interaction;
- subscriptions;
- request lifecycle;
- complex derived state;
- coordinated event handlers.

A hook must not own or return the feature's rendered DOM subtree.

A hook should normally return data, state, derived values, refs, and callbacks. Returning a React value is acceptable only when required by an established registry, slot, provider, or library contract, and the reason must be documented in the final report.

Do not create a custom hook merely to move lines out of the parent. Keep tightly coupled one-use logic local when extraction would obscure ownership.

Preserve Rules of Hooks compliance and hook call order.

## Effects, Callbacks, and Closure Semantics

Do not change effect timing, callback freshness, cleanup order, or dependency semantics incidentally.

When an existing hook has an incomplete dependency list:

1. inspect tests, comments, consumers, history available in the working tree, and observable behavior;
2. preserve demonstrated runtime behavior during this refactor;
3. keep any necessary lint suppression narrow;
4. do not create new dependency omissions merely to reproduce source-code shape.

If the intent is unclear, preserve observable behavior and report the ambiguity as technical debt. Do not silently repair it during a structural refactor.

## Utilities

Extract logic into a utility when it is:

- pure;
- reused;
- independently meaningful;
- easier to test or reason about separately.

Standalone utility modules must not import React or depend on hooks, elements, context, mutable module state, browser globals, or component lifecycle.

If writable scope requires a utility to remain in a React module, it must still be a pure function with explicit inputs and outputs.

Do not create a utility file for a trivial one-use expression unless the name materially improves comprehension.

## Props and Data Flow

Pass what a child needs to fulfill its responsibility.

Prefer explicit fields when a child needs only a small, unrelated subset of a larger value.

Pass a cohesive domain object when the child treats it as a unit and doing so creates a clearer or more stable interface.

Avoid:

- broad bag-of-props interfaces;
- unnecessary callback forwarding;
- duplicated derived state;
- hidden mutation;
- introducing context or global state solely to avoid ordinary one-level prop passing.

Preserve existing callback signatures, object identity guarantees, ref contracts, and public prop types unless explicitly authorized to change them.

## State Ownership

Keep state at the lowest level that can correctly serve all consumers.

Lift state only when multiple components require coordinated ownership.

Do not duplicate source-of-truth state across the parent and child.

Do not move state across a component identity boundary if doing so changes reset, persistence, initialization, or effect behavior.

## React Runtime Preservation

Preserve:

- mount and unmount behavior;
- element and component identity;
- key semantics and state retention;
- refs and imperative handles;
- controlled and uncontrolled input semantics;
- focus retention and focus order;
- event propagation and handler ordering;
- provider and context boundaries;
- portal targets;
- error-boundary behavior;
- Suspense and lazy-loading behavior;
- effect execution and cleanup;
- registration and subscription order;
- `useId` stability and hydration behavior;
- import-time side effects;
- DOM structure when styling, tests, accessibility, or consumers depend on it.

Extraction must not introduce hydration mismatches or move browser-only behavior into a server execution path.

## Performance

Preserve existing performance-sensitive contracts unless evidence supports a safe change.

Use `React.memo`, `useMemo`, and `useCallback` only when they protect a demonstrated or structurally credible boundary, such as:

- an expensive calculation;
- a memoized child receiving callbacks or objects;
- a dependency-sensitive effect;
- a stable external subscription API;
- a repository convention backed by profiling or architecture.

Do not memoize every extracted value or component.

Do not remove existing memoization solely because it appears unnecessary. Assess its consumers and behavioral implications first.

Avoid introducing allocations, subscriptions, or expensive calculations on paths where they did not previously occur.

## TypeScript

Preserve strict typing and existing public types.

For new or materially changed code:

- do not introduce implicit or explicit `any` unless an unavoidable third-party boundary requires it;
- use `unknown` for untrusted or not-yet-validated values;
- narrow with runtime validation, type guards, or discriminated unions;
- avoid assertions when TypeScript can prove the type;
- keep necessary assertions narrow and adjacent to the validated invariant;
- do not use double assertions such as `value as unknown as Target`;
- preserve generic inference where it is part of the component API;
- avoid widening literal types accidentally;
- preserve optionality and nullability semantics.

Do not perform unrelated type cleanup.

Create a separate types module only when types are shared across modules or when repository convention requires it. Keep component-private types near their owner.

## File Organization

Use the repository's established colocation and naming conventions.

Separate files are preferred for meaningful independently owned components, hooks, and utilities when writable scope permits them. Do not create a file for every small function or trivial component.

Before moving or creating files, check for:

- path-based lint rules;
- import and package boundaries;
- ownership rules;
- file-name conventions;
- barrel export conventions;
- circular dependency risk;
- source-file size gates;
- code generation;
- test and story discovery patterns;
- case sensitivity across supported file systems.

Preserve import paths and exports that are part of the effective public API.

Do not introduce a barrel file unless the repository uses that convention and it does not create a dependency cycle.

## Preserve Observable Behavior

Unless explicitly authorized, do not change:

- functionality;
- visual output;
- text and labels;
- CSS classes;
- CSS selector compatibility;
- DOM semantics;
- accessibility names, roles, states, relationships, and focus behavior;
- animations and transitions;
- routing;
- analytics and telemetry events;
- data fetching behavior;
- error and loading behavior;
- callback timing;
- public imports and exports;
- props, refs, and imperative APIs;
- test expectations;
- story behavior.

This is a structural refactor, not a redesign or feature change.

## Quality Expectations

The changed area should demonstrate:

- cohesive responsibilities;
- low unnecessary coupling;
- readable domain-oriented names;
- limited nesting;
- clear control flow;
- no new duplicated business logic;
- no duplicated source of truth;
- no obsolete code from the previous structure;
- no unused imports, props, exports, or suppressions introduced by the refactor;
- no unnecessary abstraction;
- no unrelated formatting churn.

Absolute zero duplication across the repository is not required. Report any intentional or remaining duplication in the changed area.

## Validation

Use the repository's canonical commands where available.

Run the narrowest relevant checks first, followed by broader checks when feasible and within scope. Depending on repository support, this may include:

- focused unit or component tests;
- typecheck;
- lint;
- formatting verification;
- package build;
- story build;
- integration tests;
- accessibility tests;
- visual regression tests;
- end-to-end or smoke tests.

Do not alter snapshots automatically without inspecting and explaining the change.

If validation requires unavailable credentials, services, browsers, containers, or environment variables, do not bypass the requirement silently. Report the blocker and any partial validation completed.

Before completion:

- inspect the final diff;
- confirm every changed file is within scope;
- confirm no unrelated user changes were overwritten;
- confirm no accidental dependency or lockfile changes occurred;
- confirm obsolete implementation code was removed;
- confirm imports and exports resolve;
- compare post-change validation with the baseline.

## Final Deliverable

After implementation, provide a concise, evidence-based report containing:

### 1. Summary

- What was refactored.
- Whether observable behavior and public API were preserved.

### 2. Decomposition

- The parent's remaining responsibilities.
- Each extracted component, hook, and utility.
- Why each boundary is appropriate.

### 3. Resulting Structure

- A tree containing only relevant changed and newly created files.

### 4. Behavioral Baseline

- Exact pre-change commands and outcomes.
- Missing tests or environmental limitations.

### 5. Validation

- Every post-change command executed.
- Working directory when relevant.
- Outcome of each command.
- Comparison with the baseline.
- Any command not run and the reason.

### 6. Compatibility Review

- Public exports and import paths.
- State, lifecycle, ref, focus, DOM, effect, and hydration contracts assessed.
- Any known ambiguity or residual risk.

### 7. Scope Review

- Files changed.
- Confirmation that all changes are within writable scope.
- Any pre-existing working-tree changes left untouched.

### 8. Remaining Concerns

- Intentional duplication.
- Missing coverage.
- Existing failures.
- Follow-up work deliberately excluded from this refactor.

### 9. Commit Suggestion

- A Conventional Commit message describing the completed refactor.

Do not claim checks, compatibility guarantees, or absence of duplication without evidence.
