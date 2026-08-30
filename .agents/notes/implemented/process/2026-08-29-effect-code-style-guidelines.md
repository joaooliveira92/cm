# Agent Note: Effect v4 code-style guidelines — coverage check

Status: implemented

## Problem

Read the upstream page <https://www.effect.website/docs/v4/code-style/guidelines> (fetch `…/guidelines.md` for the raw source; the HTML route is an Astro shell). It is short — two guidelines only:

1. **Use the platform `runMain` as the entry point.** `NodeRuntime.runMain` (`@effect/platform-node`), `BunRuntime.runMain` (`@effect/platform-bun`), `BrowserRuntime.runMain` (`@effect/platform-browser`) instead of a bare top-level `Effect.runPromise`/`runFork`. `runMain` observes the root fiber and interrupts all fibers on `SIGINT`, so finalizers run on Ctrl+C. Teardown logic must sit in the main effect for this to hold.
2. **Avoid tacit (point-free) usage.** Write `Effect.map((x) => fn(x))`, not `Effect.map(fn)`; avoid `flow` from `effect/Function`. Three reasons: overloads and optional parameters can erase generics at the call site, inference degrades, and stack traces lose a named frame.

The finding was about where this already lived in the repo, and where it didn't.

## Decision

Both guidelines were already captured verbatim-equivalent in [`effect-v4-code-style.md`](../../../skills/effect-code/references/effect-report/effect-v4-code-style.md), so nothing was added to the source notes on account of this page. The two real gaps were downstream of that, and both are now closed:

- **`SKILL.md` carried neither guideline.** `## Running at the edge` tabled `runSync`/`runPromise`/`runPromiseExit`/`runFork` and never mentioned platform `runMain`; nothing anywhere covered tacit usage. Closed by the ordinary `code-style` self-maintenance pass, which the topic table had already computed as the next pick.
- **The `runMain` guideline does not apply cleanly to this repo, and that was already decided.** [`2026-08-29-entry-point-edge-boundary.md`](../../implemented/architecture/2026-08-29-entry-point-edge-boundary.md) weighed `NodeRuntime.runMain` and rejected it: Electron owns its own lifecycle (`app.whenReady()`, `window-all-closed`), so a managed Node runtime adds a dependency for no gain. A pass transcribing "use `runMain` at the top level" flatly would have contradicted a shipped architecture decision, so the distilled guidance carries the Electron carve-out attached.

Tacit usage needed no cleanup: a scan of `apps/` and `packages/` for `Effect|Option|Either|Array.(map|flatMap|filter|tap|andThen)(<bare identifier>)` and for `flow` returned no hits, and none have been introduced since.

## Alternatives considered

- **Distill `code-style` into `SKILL.md` immediately, as part of reading the page.** Rejected, and the rejection held. The self-maintenance pass owns that edit and rewrites `distillation-state.md` in the same run; editing `SKILL.md` out of band leaves the coverage score lying and desynchronises the two files. When the distillation did happen it went through the pass, in the documented order.
- **Fence the Electron/`runMain` carve-out as a `repo-finding` in `SKILL.md` at the time of this note.** Rejected then — the registry admits fences for review findings needing judgement, not for pre-empting a pass that hasn't run — but **adopted when the pass ran**, as `electron-runmain-exception`. The reasoning that changed: once `runMain` was actually in `SKILL.md`, the carve-out stopped being a note-to-self about a future pass and became live guidance sitting next to guidance it contradicts. That is precisely what the fence mechanism is for, and it is stronger than the prose this note originally asked for.
- **Add an `effect-lint` rule banning tacit calls.** Rejected and still rejected: no violations exist to gate, and a bare-identifier heuristic can't tell an overloaded function from a safe unary one, so it would fire on correct code.

## Consequences

1. `SKILL.md` carries the platform `runMain` table under `## Running at the edge` and the tacit-usage rule (with its three-part rationale) under `## Gotchas`.
2. The Electron exception is a `<!-- repo-finding: electron-runmain-exception -->` fence with a row in the registry, so a future pass over `code-style` cannot drop it without explicitly retiring that row. The failure mode this note existed to prevent — a distilled line pushing `apps/desktop/src/main/index.ts` back toward `runMain` — is now structurally prevented rather than just written down.
3. Acceptance criterion "`effect-v4-code-style.md` is unchanged" was **not met, deliberately**. A re-fetch of the whole Code Style section found real gaps in the source note, so it was corrected first; hash moved `87d438351c` → `4124be9360` and the registry row moved with it. See [the section sweep note](2026-08-29-effect-code-style-section-sweep.md).
4. Upstream may extend this page later. The fetch route (`…/guidelines.md`) and the two-guideline scope as of 2026-08-29 are recorded above so a future re-read can diff cheaply rather than re-derive.
