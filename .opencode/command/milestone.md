---
description: Report progress against the current milestone and route the next effort within it. Reads .ai/MILESTONES.md, measures each exit criterion against the tree rather than against a status line, and names the one effort to run next. Observe, measure and route; never implement. Pass a milestone id ($ARGUMENTS) to report on one that is not current.
agent: build
---

You are reporting cm-clone's position against its current milestone. You **measure and route**; you
do not build. The milestone names an outcome and a set of exit criteria — your job is to say which
criteria are met, which are not, and which effort closes the nearest unmet one. Implementing it is
[/sprint](sprint.md)'s job.

A milestone bounds what the pipeline is allowed to ingest. That is the reason this command exists:
the spec-group fallback in [boot.md §0a](boot.md) picks groups alphabetically, and the milestone's
order overrides it.

## Read first

| File | Why |
|---|---|
| [.ai/MILESTONES.md](../../.ai/MILESTONES.md) | The current milestone: scope, non-goals, sequence, exit criteria. |
| [.ai/SPEC-ROADMAP.md](../../.ai/SPEC-ROADMAP.md) | Why a group sits where it does, and what blocks it. |
| [.ai/SPRINT-PLAN.md](../../.ai/SPRINT-PLAN.md) | The queue and the current frontier. |

`$ARGUMENTS` may name a milestone id (`M1`). Nothing passed means the one marked **Current**.

## Do

1. **Measure each exit criterion against the tree.** Run the criterion's own command where it has
   one, and record the exact output. A criterion with no command is checked by looking at the files
   it names. Never accept a `Status:` line, a plan row or a commit message as evidence that a
   criterion is met — those decay, and this command exists to catch it when they have.
2. **Locate the frontier within the milestone.** Take the milestone's § Sequence in order, find the
   first step not yet complete, and compute that effort's frontier ticket the way
   [sprint.md §1](sprint.md) does: the lowest-numbered file under `.scratch/<effort>/issues/` that is
   open, unblocked and unclaimed.
3. **Check scope.** If the plan's **Immediate next action** names work the milestone lists under
   § Non-goals, say so plainly and name the in-scope effort that should run instead. Do not edit the
   plan to match; report the divergence and let a human or the next `/sprint` resolve it.
4. **Surface the milestone's open questions.** Each one is a way the milestone stalls. For each, say
   whether it is still open and what it currently blocks.

## Do not

- Implement, chart, spec, or claim a ticket. Measuring is the whole job.
- Mark a milestone shipped. That happens in the commit that meets its last criterion, written by the
  sprint that meets it.
- Open the next milestone. Chartering one is a human's call, per
  [.ai/MILESTONES.md § Keeping this current](../../.ai/MILESTONES.md).
- Rewrite `.ai/MILESTONES.md` with status. It holds the target, not the progress; progress belongs in
  [.ai/SPRINT-PLAN.md](../../.ai/SPRINT-PLAN.md).

## Final message

The milestone and its one-line outcome; each exit criterion as **met** / **not met** / **not
measurable**, with the command run and what it actually printed; the next effort and its frontier
ticket; any scope divergence; and the open questions still blocking. Concise — a table per section,
not prose.
