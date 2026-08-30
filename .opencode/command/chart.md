---
description: Chart one foggy effort with cm-wayfinder and resolve exactly one decision ticket, writing its Agent Note. Use when an effort is too foggy to spec. Pass the effort name ($ARGUMENTS).
agent: build
---

You are charting an effort for cm-clone. This is the **one-decision-per-session** front half of the
pipeline: no code, no spec, one question answered properly.

Use the **`cm-wayfinder`** skill (`.agents/skills/cm-wayfinder/`), invoked by name.

## Scope

`$ARGUMENTS` names the effort (a `.scratch/<effort>/` directory, existing or new). If it names an
effort with no map, chart it. If the map exists, work its frontier.

A **human** invoking this command is the authorization to chart a new effort — the gate in
[.ai/AUTONOMOUS-AGENT.md § Sprint creation is gated on open maps](../../.ai/AUTONOMOUS-AGENT.md)
restrains the orchestrator from starting efforts on its own, not you from asking for one. Working an
existing map's frontier is always allowed.

Read first: [AGENTS.md](../../AGENTS.md), [CONTEXT.md](../../CONTEXT.md),
[.ai/ENGINEERING-CONTRACT.md](../../.ai/ENGINEERING-CONTRACT.md), and
[docs/agents/issue-tracker.md](../../docs/agents/issue-tracker.md) for the map and ticket format.

## Do

1. **If unmapped** — name the destination, map the frontier, and write `.scratch/<effort>/map.md`
   plus decision tickets (`research` / `prototype` / `grilling` / `task`) with `Blocked by:` edges.
   Charting is a complete session's work; stop there.
2. **If mapped** — take the frontier ticket (lowest-numbered open, unblocked, unclaimed), set
   `Status: claimed`, and answer it. Use the ticket's own type: run `research` for a fact, the
   `prototype` skill for a feel-it question, `grilling` to stress-test a plan.
3. **Resolve** — append the answer under `## Answer`, set `Status: resolved`, append the gist + link
   to the map's Decisions-so-far, and — when the answer asserts a choice, design, or convention —
   write the Agent Note into `.agents/notes/proposed/<class>/yyyy-mm-dd-topic.md` in the same commit,
   per [docs/agents/notes.md](../../docs/agents/notes.md). `## Alternatives considered` records what
   you genuinely weighed, never something reconstructed afterwards.

## Do not

- Answer more than one decision ticket. The limit is the point: it keeps each answer reasoned rather
  than batch-produced.
- Write code, or a spec. When the last decision ticket resolves, the effort is ready for
  [/sprint](sprint.md) to run spec-creator.
- Invent an answer to a question that needs a human. That is a decision request
  (`.ai/templates/decision-request.md`).

## Final message

The ticket resolved, the answer in two lines, the Agent Note path, what the map's frontier now is,
and whether the effort is ready to spec.
