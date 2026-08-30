---
description: Boot the cm-clone autonomous orchestrator from a zero-context session. Verifies repo state, loads the minimum operating context, then launches the frontier sprint. Pass an effort name ($ARGUMENTS) to override the frontier.
agent: build
---

You are booting the cm-clone autonomous orchestrator with no prior context. Confirm the repository is
in a startable state, load the minimum you need, and launch the current frontier sprint.

## 1. Verify state, before trusting anything

- `git status` — a clean tree is expected. If there are uncommitted changes, **report them and stop**;
  do not build on top of work you did not do.
- Confirm the branch. `latest_branch` is this repo's main branch — if you are on it, create a feature
  branch before any edit.
- `git fetch`, compare against `origin/latest_branch`, and pull if behind.
- Confirm `pnpm install` state is current (lockfile vs. `node_modules`).
- If `.opencode/agents/` (spec-creator, research, implementator, reviewer) is not offered and you
  only see generic subagents, opencode likely needs a restart to load them. Say so, then proceed by
  emulating the four roles with generic subagents — the role files are still the instructions.

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

If a previous session stopped mid-effort, skim the effort's tickets and resume its frontier rather
than starting over. Do not re-read the whole repo: read what the sprint needs.

## 3. Execute

Follow [sprint.md](sprint.md) — the single source of truth for the sprint loop. What you verified in
§1 and loaded in §2 satisfies its context-loading step; do not repeat it.

## Final message

Which sprints ran and their outcome, commit hashes, validation evidence (exact commands + observed
results), whether the next sprint is queued, and the precise reason you stopped. Concise.
