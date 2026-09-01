---
description: Boot the cm-clone autonomous orchestrator from a zero-context session. Resolves $ARGUMENTS (an effort name, a ticket path, or any file path) to a live ticket, runs a bounded preflight, then launches the frontier sprint via sprint.md. Boot is done when a ticket is claimed and routed — it is not a repo audit.
agent: build
---

You are booting the cm-clone autonomous orchestrator with no prior context. Your job is to pick the
one ticket to build next and start it — not to audit the repository. Boot is complete when a ticket
is claimed and routed by phase; everything after that is [sprint.md](sprint.md)'s loop.

## 0. Resolve the target ($ARGUMENTS)

- **Nothing passed** → take the frontier the plan's **Immediate next action** names, then
  immediately re-derive it from `.scratch/` (plan rows decay; the tracker is truth).
- **An effort** (a name or a `.scratch/<effort>/` path) → that effort's frontier ticket.
- **A ticket path** (`.scratch/<effort>/issues/<NN>-*.md`) → that ticket.
- **Any other file path** → find the `.scratch/<effort>/` that owns that path and take that effort's
  frontier ticket. A path is advisory, not the work: the pipeline is ticket-driven, so you implement
  the owning ticket, never the raw file. If no live effort owns the path, report that nothing
  ticket-backed covers it and stop — do not invent work.

Compute the frontier the same way everywhere: scan `.scratch/<effort>/issues/` for the
lowest-numbered file that is open, unblocked, and unclaimed (see
[docs/agents/issue-tracker.md](../../docs/agents/issue-tracker.md)).

## 1. Verify state — a finite checklist, then move

A handful of commands, then start. No more.

- `git status` — a clean tree is expected. Uncommitted changes: report them and stop; do not build
  on top of work you did not do.
- Confirm the branch and sync: work directly on `dev` per [.ai/AUTONOMOUS-AGENT.md](../../.ai/AUTONOMOUS-AGENT.md)
  § Git policy — no feature branches. `git fetch`, compare `origin/dev`, pull if behind.
- Confirm `pnpm install` state is current (lockfile vs. `node_modules`).
- If `.opencode/agents/` (spec-creator, research, implementator, reviewer) is not offered and you
  only see generic subagents, opencode likely needs a restart to load them. Say so, then proceed by
  emulating the four roles with generic subagents — the role files are still the instructions.

Then claim the frontier ticket (`Status: claimed`, save) before any work and route by phase.

**Do not audit the tracker before starting.** You may not spend the session reconciling ticket
`Status:` lines against the git log, disproving a past commit's message, or checking every row of
the sprint plan. The tracker names the frontier; the ticket you opened is the source of truth for
its own acceptance criteria, and those are verified *inside* implementation, never in a preflight.
If you catch yourself cross-checking a shipped commit against its message or re-deriving effort
state that is not the frontier ticket, you have drifted: claim the ticket and route.

## 2. Load minimum operating context

Read, in this order, before editing anything:

| File | Why |
|---|---|
| [AGENTS.md](../../AGENTS.md) | Repo conventions and the quality gate. |
| [.ai/AUTONOMOUS-AGENT.md](../../.ai/AUTONOMOUS-AGENT.md) | Authority, autonomy, stop conditions. |
| [.ai/ENGINEERING-CONTRACT.md](../../.ai/ENGINEERING-CONTRACT.md) | The binding contract. |
| [.ai/ORCHESTRATION.md](../../.ai/ORCHESTRATION.md) | The pipeline, roles, and validation gate. |
| [.ai/SPRINT-PLAN.md](../../.ai/SPRINT-PLAN.md) | The queue and **Immediate next action**. |
| [CONTEXT.md](../../CONTEXT.md) | The domain language for the effort you are about to touch. |
| The effort's `map.md` / `spec.md` / `issues/` | The actual work. |

Do not re-read the whole repo: read what the sprint needs. If a previous session stopped mid-effort,
skim the effort's tickets and resume its frontier rather than starting over.

## 3. Execute

Follow [sprint.md](sprint.md) — the single source of truth for the sprint loop. What you verified
in §1 and loaded in §2 satisfies its context-loading step; do not repeat it.

## Final message

Which sprints ran and their outcome, commit hashes, validation evidence (exact commands + observed
results), whether the next sprint is queued, and the precise reason you stopped. Concise.