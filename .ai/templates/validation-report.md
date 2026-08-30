# Validation Report: <effort>

Written by the orchestrator to `.ai/reports/<effort>.md` after the gate, before the commit. Records
what was **observed**, not what was expected. If a command was not run, say so — an omitted step and
a passing step must never look alike.

## Sprint

- Effort: `.scratch/<effort>/`
- Tickets closed: `<NN-name>`, …
- Branch: `<branch>` (off `latest_branch`)
- Commits: `<hash> <subject>`

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | | | |

## Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | run / not applicable because … |
| determinism | | run / not applicable because … |
| save compatibility | | run / not applicable because … |

Paste the actual failing output for anything that did not pass, rather than paraphrasing it.

## Behavior changes

Any change to a player-visible or seeded outcome: what changed, the cause, whether saves are
affected, and the migration or the reasoned decision that none is needed.

## Decision records

- ADRs added: 
- Agent Notes written (`proposed/`): 
- Agent Notes promoted (`implemented/`): 

## Pre-existing failures

Anything that was already broken before this sprint, kept distinct from what this sprint touched.

## Deferred and known limitations

What was intentionally left, and where it is tracked.

## Review

Reviewer verdict, the blocker/high findings and their repairs, and anything the reviewer flagged as
needing a decision request.
