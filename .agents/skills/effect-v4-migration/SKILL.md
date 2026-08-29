---
name: effect-v4-migration
description: Plan and drive an incremental (non-greedy) migration of a TypeScript codebase to Effect v4. Quick-reviews the source against the v4 conventions, finds problems (bare throws, Promise chains, scattered run* calls, invisible error handling, hidden dependencies), then builds the migration as a map of seam tickets and works it one ticket per session, the way the wayfinder → to-spec → to-tickets chain works. Use when the user wants to migrate a codebase to Effect, plan that conversion, or get a review that ends in a sequenced migration plan rather than a big-bang rewrite.
---

# Effect v4 Migration

An incremental migration of a TypeScript codebase to Effect v4: a quick review that finds where the code diverges from the v4 conventions, then a **map** of tickets that convert the code one seam at a time. Each run either charts the map or works one ticket. A session never rewrites the app wholesale, and a charting run never edits code; it finds the seams and writes them down.

## Knowledge base

- The source of truth on the v4 conventions is the research note set bundled with the `effect-code` skill, at `../effect-code/references/effect-report/`, starting with `effect-v4-getting-started.md`. Read the getting-started note before charting; pull in the sibling topic notes (error-management, resource-management, requirements-management, concurrency, etc.) as a ticket's blast radius touches that area. This skill and `effect-code` travel together — copy both directories when using either in another project.
- For writing and checking actual Effect code, load the `effect-code` skill; it carries the same conventions in a tighter form.
- The note describes the v4 release-candidate API. Pin the installed version during charting, and flag API drift when a ticket hits code that disagrees with the note.

## The review lens: what we look for

The quick review is a scan for the patterns below. Each row is a divergence from the v4 conventions, what the v4 shape is, and what the divergence signals about migration. The "v4 convention" column is a quick-scan summary, not the source of truth — `effect-code`'s `SKILL.md` is canonical and evolves under its own self-maintenance loop, so if the two ever disagree, defer to `effect-code` and update this table to match.

| Current code | v4 convention | Migration signal |
|---|---|---|
| `throw` and `try/catch`, failures invisible in the types | `Data.TaggedError`/`Data.Error` classes, directly yieldable in `Effect.gen` (no `Effect.fail` wrapper needed), tracked in the `E` channel | every module with a `throw` is conversion surface; the more bare throws, the lower the ceiling on the current error handling |
| `Promise<T>` returned, rejections handled ad hoc | `Effect<A, E, R>`, lifted with `Effect.tryPromise`, chained with `pipe` or `Effect.gen` | async modules are the bridge: each one lifts into Effect on its own |
| `Effect.succeed(sideEffect())` or eager side effects inside a model | `Effect.sync`, `Effect.suspend`, lazy models | an eager side effect is a correctness bug before it is a migration concern; worth its own early ticket |
| dependencies threaded as arguments or reached through global singletons | a `Context.Service`, built by a `Layer` (`Layer.succeed`/`Layer.effect`, not ad hoc `Effect.provideService`) once construction has any dependency, declared in `R`, provided at the edge | modules with many injected arguments or singletons are the natural service seam; a constructor that itself needs other services is the signal to reach for a `Layer` instead of inlining the implementation |
| `Effect.run*` scattered through the app | runners at the edge of the program only, one entry point | count the `runSync|runPromise|runFork` calls; each one beyond the entry point is a leak standing in the way of a single runtime |
| `new Error("literal")` string soup | `Data.TaggedError` so errors are catchable by tag | a module is done migrating when its expected errors are catchable, not when it compiles |
| manual `try/finally` or ad hoc `.close()`/`.release()` cleanup | `Effect.acquireRelease` + `Effect.scoped`, or `Effect.acquireUseRelease` for single-call resources | cleanup that isn't guaranteed under interruption is a correctness gap, not just a style mismatch; flag it same as an eager side effect |

## Charting run

The user invokes this skill on a codebase. The charting run builds the map and stops; it hand-resolves nothing.

1. **Pin the land.** Check `package.json` for `effect` and its version, `typescript` (needs 5.9+ for v4), and `tsconfig.json` for `"strict": true`. If the repo has no `effect` dependency yet, the first ticket is the install, a pure task.
2. **Measure the blast radius cheaply.** Grep for `effect` imports, `Promise<`/`async`/`await`, `throw`, and `runSync|runPromise|runFork`, counted per directory. This separates the conversion surface from the untouched pure parts, and finds the wide refactors while they are still cheap to name.
3. **Read the entry points and trace outward.** Find `main`, `index`, handlers, page mounts. Walk a couple of call paths far enough to see where the program touches IO (fetch, database, filesystem, logging) and which modules sit above those touch points.
4. **Write the map.** Seams become tickets now; the parts you can name but not yet pin down become fog. This is skimming, not excavation. The map's whole point is that you only resolve what the frontier makes visible, so don't read the codebase start to finish.

## The migration map

The map has the same shape as a wayfinder map on this repo's tracker: a single map file at `.scratch/<effort>/map.md` (lowercase slug of the effort) with one child file per ticket at `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`. Blocking is a `Blocked by:` line; the frontier is the open, unblocked, unclaimed tickets in number order. See the tracker's "Wayfinding operations" section in `docs/agents/issue-tracker.md`.

```markdown
## Destination

<what reaching the end looks like: every entry point runs its program at the edge, every domain
function declares Effect<A, E, R>, no bare throws in program logic, expected errors are tagged,
dependencies come from Context. One or two lines; every session orients to it before choosing a ticket.>

## Notes

<the pinned effect version; load the "effect-code" skill each session; standing preferences for this
effort, e.g. never widen a ticket's blast radius, keep every step green>

## Decisions so far

<!-- one line per closed ticket: gist, then link to the ticket file -->

- [<ticket title>](<ticket link>): <one-line gist of the answer>

## Not yet specified

<!-- in-scope fog: suspected seams and questions you can't yet ticket, because they hang on open tickets -->

## Out of scope

<!-- work ruled out of this effort; never graduates -->
```

Each ticket body is the conversion to do or the decision to make, sized to one session:

```markdown
## Question

<the seam to convert, or the decision this ticket resolves>

Type: task | grilling | research | prototype
Blocked by: NN, NN (or "None (can start immediately)")
Status: open
```

## Sequencing, or how not to be greedy

The order rules that keep the migration iterative. The frontier is always the takeable work; order it by the rules below rather than by line count.

- **Seams before ocean.** A ticket only converts a module the rest of the code can survive without. A module is a seam when nothing else imports it, or when you can bridge it with a run/lift at its boundary.
- **Edge-first.** Convert the adapters at the edge of the app (HTTP, database, filesystem, logging) and the entry points before the pure logic inside. Then the inner Promise chains have an Effect world to hand results into, and the hardest part of the migration, the runtime, is settled once.
- **Interop is the bridge, so slices can land in any order.** The whole incremental approach rests on two-way lifting between Effect and plain async code. Lift a Promise into Effect with `Effect.tryPromise({ try, catch })`, remapping the rejection to a tagged error. Run an Effect from untouched code with `Effect.runPromise(program)` at the seam. A slice is green when both its boundaries are explicit lifts or runs.
- **Wide refactors go expand–contract.** Retyping a shared symbol across hundreds of call sites is not a vertical seam. Add the new form beside the old, migrate call sites in batches sized by directory or package, then delete the old form once no caller remains. Each batch is its own ticket, blocked by the expand, and the contract ticket is blocked by every batch.
- **One session, one ticket.** Resolve no more than one ticket per session, research tickets excepted. The map is the plan; the plan advances one frontier ticket at a time.
- **Green at every step.** A conversion finishes when `tsc --noEmit` passes with `strict: true`, the test suite passes, and the interop boundaries at its edges are explicit. Nothing is left half-wired.

## Ticket types

- **task** (default). Convert a seam: lift an async module into Effect, introduce a `Context` service, move a `run*` call out of the middle of a program to the edge.
- **grilling**. Decide where a boundary goes, which side of an interop seam a module lands on, or whether a `Context` service is warranted now. Conversation, not code.
- **research** (AFK). Third-party interop gotchas, deprecations between the installed version and rc, how a library this repo depends on maps into Effect.
- **prototype** (HITL). When an effect-shaped design (a service, a `gen` rewrite of gnarly control flow) needs a rough artifact to react to before it earns a ticket.

## Working the map

User invokes with the effort slug or a ticket. Pick the first frontier ticket if none is named. Claim it (set `Status: claimed`) before any work, then resolve it, then:

1. Append the answer under an `## Answer` heading and set `Status: resolved`.
2. If the answer asserts a decision (a boundary choice, a sequencing rule, an interop convention), write the durable note atomically with resolution, per the resolution step of `/cm-wayfinder` and the prose rules in `cm-wayfinder/references/prose.md`: under `.agents/notes/proposed/{class}/yyyy-mm-dd-topic.md`, promoted later when the code ships. A mechanical conversion with no decision attached gets no note.
3. Append a gist and link to the map's Decisions so far.
4. Graduate any fog the answer made specifiable into fresh tickets, and rule out of scope anything the answer pushed past the destination.

## Verification

Per slice: `tsc --noEmit` under `strict: true`, plus the test suite. The common failure modes in Effect code are type-level, not runtime: an unhandled error channel (`E` not `never`), unmet requirements (`R` not empty, usually a service not provided), and `runSync` used on an effect that can fail or go async. A green slice is the whole point of iterating seam by seam; never carry a red slice forward.