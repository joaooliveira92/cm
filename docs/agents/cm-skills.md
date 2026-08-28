# CM Skill Suite

Seven `cm-*` skills under `.agents/skills/` plan and build work while wiring durable decisions into
the [Agent Notes](notes.md) convention. Six are forked, prefixed copies of this repo's existing
decision-record chain (`wayfinder`, `implement`, `to-spec`, `to-tickets`, `triage`,
`setup-matt-pocock-skills`); `cm-archive-notes` is new, with no unprefixed original. The unprefixed
originals stay untouched as an upstream mirror — `cm-*` is a separate, diverging set, not a
replacement.

This doc is a catalog with one line per skill and a link to the source of truth, its own `SKILL.md` —
same gist-then-link shape used throughout this convention, so the instructions live in exactly one
place and this doesn't drift out of sync with them.

## Setup

| Skill | Purpose |
|---|---|
| [cm-setup](../../.agents/skills/cm-setup/SKILL.md) | Configure this repo for the `cm-*` skills: issue tracker, triage labels, domain docs, and the Agent Notes convention (`docs/agents/notes.md`). Run once before first use of the others. |

## Plan → build chain

Run roughly in this order; each step downstream of `cm-wayfinder` depends on the Agent Notes it wrote.

| Skill | Purpose |
|---|---|
| [cm-wayfinder](../../.agents/skills/cm-wayfinder/SKILL.md) | Chart a large effort as a map of decision tickets and resolve them one at a time. Its resolution step is Agent-Notes-aware: a note-worthy answer gets a durable Agent Note written atomically with resolution. |
| [cm-to-spec](../../.agents/skills/cm-to-spec/SKILL.md) | Turn the conversation into a spec. Implementation Decisions bullets carry forward gist+link references to the Agent Notes their source tickets produced. |
| [cm-to-tickets](../../.agents/skills/cm-to-tickets/SKILL.md) | Break a spec or plan into tracer-bullet tickets. Each ticket gains a `## Decisions` section listing the Agent Notes it implements. |
| [cm-implement](../../.agents/skills/cm-implement/SKILL.md) | Build the work. Between running the full test suite and committing, it follows the forward-links from the spec/tickets and promotes each fully-shipped Agent Note from `proposed/` to `implemented/`. |

## Auxiliary

| Skill | Purpose |
|---|---|
| [cm-triage](../../.agents/skills/cm-triage/SKILL.md) | Move issues and PRs through triage roles. Unchanged from the unprefixed original — it doesn't read or write Agent Notes. |
| [cm-archive-notes](../../.agents/skills/cm-archive-notes/SKILL.md) | Audit, archive, or prune Agent Notes: a five-way classify-by-future-value taxonomy, invoked explicitly, not automatically. |

## Enforcement

Prose-only for v1 across the whole suite: no format-verification script, no CI gate. See
[notes.md](notes.md) for the convention these skills write to.
