# Adversarial Review Prompt

Review the implemented ticket as a hostile but constructive verifier. Do not merely summarize it,
and do not edit anything until the review is complete.

This is the standards checklist the reviewer role applies on top of the
[code-review](../.agents/skills/code-review/SKILL.md) skill's two axes (Standards and Spec).

## Establish scope

Read the ticket and its acceptance criteria, the spec it came from, the Agent Notes it cites, the
relevant ADRs, [CONTEXT.md](../CONTEXT.md), [ENGINEERING-CONTRACT.md](ENGINEERING-CONTRACT.md), and
the diff. Verify the implementator's claimed commands and results against the repository yourself —
inspect the code, do not trust the summary.

## Review dimensions

1. **Ticket fidelity** — does it do exactly what the acceptance criteria asked, no more? Scope creep
   and invented rules both count.
2. **Domain language** — every concept named as CONTEXT.md names it, no _Avoid_ synonyms, no new
   term introduced without a CONTEXT.md entry.
3. **Authority** — commands route through the decider; state is the fold of events; no component or
   handler mutates authoritative state directly.
4. **Projection vs. state** — nothing derived got persisted; no rating cache; no reintroduced
   Current Ability scalar.
5. **Determinism** — same seed, same result; chunked resimulation reproduces; no `Math.random()`,
   `Date.now()`, locale, env, UUID, or filesystem ordering inside `packages/shared` or
   `packages/game-engine`; UI interaction consumes no simulation randomness.
6. **Package graph** — direction preserved, no cycles, no deep imports into another package's
   internals, no Node/Electron/React leaking into the pure packages.
7. **Effect discipline** — failures are tagged errors in the type; no throws across seams; no
   `Effect.run*` outside an edge; explicit concurrency; nothing on the `effect-lint` banned list;
   layers composed as the `effect-code` skill prescribes.
8. **RPC boundary** — contract change lives in `packages/contracts`, both directions schema'd,
   roundtrip test present, no raw internal error or filesystem path escaping to the renderer.
9. **Electron boundary** — context isolation intact, preload capability still narrow and named, no
   new generic invoke or broad filesystem handle, navigation policy unchanged.
10. **Persistence** — schema change ships its migration; writes are transactional; save → load →
    continue preserves future outcomes.
11. **Test meaningfulness** — can each new test actually fail for the right reason? Watch for
    assertions that restate the implementation, oversized snapshots, and fixtures regenerated with
    no stated cause.
12. **Test omissions** — a boundary, an invalid input, or a reachable UI path with no coverage.
13. **Unnecessary abstraction** — speculative interfaces, a package that should have been a
    function, premature optimization, indirection with one caller.
14. **Decision records** — a constraining decision with no ADR or Agent Note; a shipped note left in
    `proposed/`; a note whose `## Alternatives considered` is invented after the fact.
15. **Documentation** — Markdown follows `doc-standards`, links resolve, no doc left describing the
    old behavior.
16. **Delivery policy** — Conventional Commits, feature branch, clean tree, no self-merge, no
    weakened gate.

## Repeat findings

If you are raising an Effect finding that this repo has now seen three times, say so explicitly and
recommend routing it per AGENTS.md — a rule in [scripts/effect-lint.ts](../scripts/effect-lint.ts)
if it is mechanical, a fenced line in the `effect-code` skill if it needs judgement. Do not let the
review keep absorbing it.

## Required output

Per finding:

- severity: blocker / high / medium / low;
- the contract section, ADR, or CONTEXT.md term it violates;
- exact file and symbol or line range;
- the observed evidence;
- why it matters;
- the smallest safe remediation;
- whether that remediation is in scope, or needs a decision request.

Then:

- unverified assumptions;
- missing tests;
- determinism and save-compatibility assessment;
- boundary and security assessment;
- verdict: **APPROVE** (no blocker or high) or **NEEDS_REWORK**, with the exact repair list.

Do not call a stylistic preference a blocker unless it violates an explicit repo contract.
