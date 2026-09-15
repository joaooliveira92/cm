---
description: Boot the cm-clone autonomous orchestrator from a zero-context session. Resolves $ARGUMENTS (an effort name, a ticket path, or any file path) to a live ticket — or, when the queue is empty, ingests the next spec group from docs/specs/ — runs a bounded preflight, then launches the frontier sprint via sprint.md. Boot is done when a ticket is claimed and routed, or a spec group is seeded and routed to charting; it is not a repo audit.
agent: build
---

You are booting the cm-clone autonomous orchestrator with no prior context. Your job is to pick the
one ticket to build next and start it — not to audit the repository. Boot is complete when a ticket
is claimed and routed by phase; everything after that is [sprint.md](sprint.md)'s loop. The loop
does not stop after one ticket — it auto-advances through the queue until a hard stop fires
(queue empty, repo corruption, or human saying stop).

## 0. Resolve the target ($ARGUMENTS)

- **Nothing passed** → take the frontier the plan's **Immediate next action** names, then
  immediately re-derive it from `.scratch/` (plan rows decay; the tracker is truth). If the plan
  says the queue is empty — no open, unblocked, unclaimed ticket in any effort — fall through to
  the spec-group fallback below.
- **An effort** (a name or a `.scratch/<effort>/` path) → that effort's frontier ticket.
- **A ticket path** (`.scratch/<effort>/issues/<NN>-*.md`) → that ticket.
- **Any other file path** → find the `.scratch/<effort>/` that owns that path and take that effort's
  frontier ticket. A path is advisory, not the work: the pipeline is ticket-driven, so you implement
  the owning ticket, never the raw file. If no live effort owns the path, report that nothing
  ticket-backed covers it and stop — do not invent work.

Compute the frontier the same way everywhere: scan `.scratch/<effort>/issues/` for the
lowest-numbered file that is open, unblocked, and unclaimed (see
[docs/agents/issue-tracker.md](../../docs/agents/issue-tracker.md)).

### 0a. Spec-group fallback (plan queue is empty)

When no ticket exists anywhere in `.scratch/`, pick the next spec group from `docs/specs/` that has
no corresponding effort yet. This is how the pipeline ingests the 19 spec groups (A–S):

1. List `docs/specs/` directories in alphabetical order (they are `group_a_*` through `group_s_*`).
2. For each, extract the group letter from the directory name (`group_a_*` → `a`).
3. Check whether `.scratch/group-X-*/` exists for that letter (glob).
4. The **first group whose letter has no matching `.scratch/` directory** is the next spec group.
5. Create `.scratch/<spec-slug>/` for it, copy the spec files there as the initial spec, then route
   to `cm-wayfinder` to chart the effort (see sprint.md §2 — route by phase).
6. If every spec group A–S already has a `.scratch/` effort, stop — the entire spec corpus has been
   ingested and the queue is genuinely empty.

Derive the spec slug from the directory name: replace underscores with hyphens and keep the full
name. Example: `group_a_application_shell_and_game_lifecycle_remaining` →
`group-a-application-shell-and-game-lifecycle-remaining`. This becomes both the `.scratch/`
directory name and the effort name.

This fallback ensures boot always has a target: either a live ticket or a spec waiting to be
charted. It never invents work that has no spec behind it.

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

sprint.md will loop continuously, auto-advancing through the queue until a hard stop condition
(queue empty, repo corruption, or human saying stop). This session does not end after one sprint:
keep running until one of those fires.