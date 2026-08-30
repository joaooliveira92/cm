# Sprint Implementation Procedure

The reusable per-sprint procedure. [AUTONOMOUS-AGENT.md](AUTONOMOUS-AGENT.md) says what you may
decide; [ENGINEERING-CONTRACT.md](ENGINEERING-CONTRACT.md) says what good looks like; this says what
to do, in order.

## Inputs

- Domain language: [CONTEXT.md](../CONTEXT.md)
- Repo conventions and gate: [AGENTS.md](../AGENTS.md)
- Binding contract: [ENGINEERING-CONTRACT.md](ENGINEERING-CONTRACT.md)
- Operating authority: [AUTONOMOUS-AGENT.md](AUTONOMOUS-AGENT.md)
- Pipeline and roles: [ORCHESTRATION.md](ORCHESTRATION.md)
- Queue: [SPRINT-PLAN.md](SPRINT-PLAN.md); traceability: [TRACEABILITY.md](TRACEABILITY.md)
- The effort itself: `.scratch/<effort>/map.md`, `spec.md`, `issues/`
- Approved ADRs and the Agent Notes your tickets cite

## 1. Inspect

Observe the repository: branch, tree state, remotes, package graph, the tests that exist near your
change, and the effort's current ticket statuses. Record any failure that was already there. This
repo is not greenfield — do not plan as if it were.

## 2. Trace

Map every acceptance criterion to the packages it touches, the CONTEXT.md terms it uses, the ADRs or
Agent Notes that constrain it, and the concrete test that will prove it. Name what the sprint is
deliberately *not* doing, so a reduced implementation cannot be mistaken for a complete one.

## 3. Plan

Write a short dependency-ordered plan before editing. Identify up front: the seams you will cross,
the boundaries (RPC contract, Electron preload, package graph) you will touch, any migration, any
change to a seeded result, and which stop conditions are plausibly in play.

## 4. Implement

- Preserve package dependency direction; keep `packages/shared` and `packages/game-engine` pure.
- Model failures as tagged errors in `Effect<A, E, R>`. Keep `Effect.run*` at the edges.
- Route commands through the decider; produce events; fold to state. Never mutate authoritative
  state from a command handler or a React component.
- Keep derived projections derived. Do not persist a rating.
- Declare concurrency explicitly on `Effect.all` / `Effect.forEach`.
- Change the RPC surface only in `packages/contracts`, with schemas on both sides.
- Use CONTEXT.md's exact vocabulary in code, tests, and UI copy. If you need a concept it does not
  name, that is either a CONTEXT.md addition (via `domain-modeling`) or a sign you are inventing.
- Write the ADR or Agent Note at the moment you make the decision, not retroactively at the end.

## 5. Test continuously

Add the smallest test that proves each acceptance criterion, including the invalid and boundary
cases. Reach for the heavier classes — determinism, save/load continuation, RPC roundtrip, Playwright
— when the contract's risk table says the change calls for them. Run the focused tests for your
package after each increment rather than saving all validation for the end.

## 6. Validate

Run `pnpm check:all`. Add `test:e2e` if a screen changed, determinism evidence if seeding or
simulation changed, and save/load evidence if persistence changed. Then check your own artifacts a
second time — files written, ticket statuses, notes promoted, tree clean — instead of trusting the
first green run.

## 7. Review

Hand the ticket to the reviewer role, which applies [REVIEW-PROMPT.md](REVIEW-PROMPT.md) and the
`code-review` skill. Repair only bounded, understood, in-scope findings. Escalate anything that
turns out to be a domain ambiguity rather than patching around it.

## 8. Deliver

Update the ticket status and the map's Decisions-so-far, promote shipped Agent Notes to
`implemented/`, refresh the SPRINT-PLAN row and TRACEABILITY entry, write
`.ai/reports/<effort>.md` from [templates/validation-report.md](templates/validation-report.md), and
commit in small Conventional Commits. Do not self-merge.

## Prohibited shortcuts

Every shortcut an implementation might reach for is already banned by the binding contract: god
objects and persisted scalars by § Authority and state, nondeterminism by § Determinism, route and
seam bypasses by § Boundaries, thrown errors and misplaced `Effect.run*` by § Effect discipline,
test loosening by § Tests and acceptance, and speculative packages by § Package graph.
[ENGINEERING-CONTRACT.md](ENGINEERING-CONTRACT.md) is the single list — keep it satisfied.
