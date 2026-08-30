# cm-clone Orchestration Pipeline

The orchestrator — the primary agent, launched by [.opencode/command/sprint.md](../.opencode/command/sprint.md)
— drives every sprint through four subagent roles plus an orchestrator-owned validation gate. Roles
live in [.opencode/agents/](../.opencode/agents/). The pipeline is **ticket-driven**: nothing gets
implemented that is not a ticket on the [`.scratch/` tracker](../docs/agents/issue-tracker.md).

## Skills the pipeline runs on

The `cm-*` skills are this repo's Agent-Notes-aware fork of the decision-record chain — see
[docs/agents/cm-skills.md](../docs/agents/cm-skills.md). Use the `cm-*` copies, not the unprefixed
originals: the originals are an upstream mirror that does not write Agent Notes.

| Skill | Phase | What it produces |
|---|---|---|
| [cm-wayfinder](../.agents/skills/cm-wayfinder/SKILL.md) | **chart** | `.scratch/<effort>/map.md` + decision tickets, and an Agent Note per note-worthy answer |
| [research](../.agents/skills/research/SKILL.md) | **ground** | `docs/research/<effort>-<topic>.md` |
| [cm-to-spec](../.agents/skills/cm-to-spec/SKILL.md) | **spec** | `.scratch/<effort>/spec.md`, carrying forward its Agent Note links |
| [cm-to-tickets](../.agents/skills/cm-to-tickets/SKILL.md) | **slice** | `.scratch/<effort>/issues/<NN>-<name>.md`, each with a `## Decisions` section |
| [cm-implement](../.agents/skills/cm-implement/SKILL.md) | **implement** | code + tests, and promotion of shipped Agent Notes `proposed/` → `implemented/` |
| [code-review](../.agents/skills/code-review/SKILL.md) | **review** | Standards + Spec findings, side by side |

The four `cm-*` skills carry `disable-model-invocation: true`; `research` and `code-review` do not.
That flag suppresses *opportunistic* firing only — the orchestrator and the roles invoke every one of
them **by name** through the skill tool, and the flag does not block that.

## Phases

1. **Chart (cm-wayfinder)** — when an effort spans more than one session or the way is foggy: name
   the destination, map the frontier, write `map.md` plus decision tickets
   (`research`/`prototype`/`grilling`/`task`), wire `Blocked by:` edges, and work **one decision
   ticket per session**. Resolving a ticket writes its Agent Note atomically with the answer. If the
   way is already clear and fits one session, skip to Spec.
2. **Ground (research)** — for a sprint that needs facts it does not have (a real-world football
   rule, a library's actual API, a format), the research role reads primary sources in the background
   and writes one note under `docs/research/`. It authors no game constants; balance numbers are a
   design decision, not a research finding.
3. **Spec (spec-creator)** — synthesizes the resolved tickets into `.scratch/<effort>/spec.md` in the
   `cm-to-spec` format, and sets its `Status:` per [triage-labels.md](../docs/agents/triage-labels.md)
   when it is ready for slicing.
4. **Slice (cm-to-tickets)** — breaks an approved spec into **tracer-bullet vertical slices**: each
   ticket is a narrow but complete path through every layer, declares its blocking edges, and is
   numbered frontier-first at `.scratch/<effort>/issues/<NN>-<name>.md`.
5. **Implement (implementator)** — works the **frontier** (open, unblocked, unclaimed; lowest number
   wins), one ticket at a time, claiming it before any work.
6. **Review (reviewer)** — adversarially checks that ticket against its acceptance criteria, the
   spec, the contract, and this repo's standards.
7. **Gate + commit (orchestrator)** — runs the validation gate, owns Git, ADRs, note promotion and
   the sprint plan, then auto-advances.

## Roles

| Role | File | Skill | Permissions | Output |
|---|---|---|---|---|
| 1. spec-creator | [spec-creator.md](../.opencode/agents/spec-creator.md) | `cm-to-spec` | writes the spec only | `.scratch/<effort>/spec.md` |
| 2. research | [research.md](../.opencode/agents/research.md) | `research` | writes notes only | `docs/research/<effort>-<topic>.md` |
| 3. implementator | [implementator.md](../.opencode/agents/implementator.md) | `cm-implement` | edit + run | one frontier ticket closed, with code, tests, exact results, changed-file list |
| 4. reviewer | [reviewer.md](../.opencode/agents/reviewer.md) | `code-review` | read-only | severity-tagged findings + APPROVE / NEEDS_REWORK |
| orchestrator | — | `cm-wayfinder`, `cm-to-tickets` | owns Git + gate | map, tickets, gate, commits, ADRs, plan updates |

## Handoff contract

- A subagent's final report is a **spec for your next step, not the source of truth**. Re-read the
  files it claims to have written before acting on them, and independently verify any result it
  claims to have observed.
- Write scope is role-locked. The spec-creator writes one spec file; research writes one note; the
  reviewer writes nothing at all. Anything else they think is needed gets reported to you instead.
- One decision ticket per session (the wayfinder rule). Several small implementation tickets may
  close in one session, but only if each one passes the gate on its own.
- On `NEEDS_REWORK` (blocker or high), send the implementator back to repair that same ticket, then
  re-review. Never gate-and-commit over an unresolved blocker.
- Keep each role's context small. The point of the split is that no single subagent accumulates the
  whole project.

## Orchestrator-owned validation gate

Mandatory before any commit. Run it yourself — do not accept a subagent's word that it passed — and
record the exact observed results in `.ai/reports/<effort>.md`:

- **`pnpm check:all`** — typecheck, `oxlint`, `effect-lint`, `verify-md-links`, unit tests. This is
  the whole gate, defined once in [scripts/run-gates.ts](../scripts/run-gates.ts).
- **`pnpm --filter @cm-clone/desktop test:e2e`** — when the change touches a UI-reachable path.
  Excluded from `check:ci` because it needs OS-level setup; not optional when a screen changed.
- **Determinism** — when the change touches match simulation, seeding, or Player Development: run
  the seeded path twice and show the results are identical, and resimulate a chunked match.
- **Save compatibility** — when the change touches persistence or a schema: save, load, continue,
  and show future outcomes are preserved; state the migration.
- **Note promotion** — every Agent Note whose code shipped this sprint moved `proposed/` →
  `implemented/` in the same commit.

A green build is not acceptance (ENGINEERING-CONTRACT § Tests and acceptance).

## Orchestrator responsibilities

- Pick the sprint from [SPRINT-PLAN.md](SPRINT-PLAN.md)'s **Immediate next action**; `$ARGUMENTS`
  may override it; auto-advance in the plan's dependency order.
- Chart foggy efforts through `cm-wayfinder` before specifying them; go straight to spec when the
  way is clear.
- Own all Git: small Conventional Commits on a feature branch off `latest_branch`, no self-merge,
  clean tree.
- Keep traceability current: the SPRINT-PLAN row, [TRACEABILITY.md](TRACEABILITY.md), the ticket
  `Status:` lines, the map's Decisions-so-far, and the report under `.ai/reports/`.
- Resolve routine decisions yourself and record the constraining ones. Stop only on a genuine stop
  condition from [AUTONOMOUS-AGENT.md](AUTONOMOUS-AGENT.md).
- **Resilience**: when a ticket blocks (NEEDS_REWORK on second review, stop condition, genuine
  blocker), write the decision request, update the ticket status, and advance to the next frontier
  ticket. Do not halt the run for a single failed ticket — log it and continue.
