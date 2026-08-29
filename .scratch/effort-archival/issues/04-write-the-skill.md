# Write the cm-archive-effort skill

Type: task
Status: open

Blocked by: 01, 02, 03

## Question

Author `.agents/skills/cm-archive-effort/SKILL.md` implementing the convention that tickets 01–03
settle, symlink it into `.claude/skills/` the way every other skill in this suite is wired, and
register it in the suite's catalog.

Nothing here is a decision — it's the writing, once the decisions exist. Consult `writing-for-agents`
and `doc-standards`; model the prose shape on
[cm-archive-notes](../../../.agents/skills/cm-archive-notes/SKILL.md), the direct sibling.

Scope:

- The `SKILL.md` itself: frontmatter with `disable-model-invocation: true` (explicit invocation only,
  matching `cm-archive-notes`), the shortlist procedure from ticket 01, the link handling from ticket
  02, the freeze/exclusion/roadmap semantics from ticket 03, and a report section.
- The `.claude/skills/cm-archive-effort` symlink.
- A row in [docs/agents/cm-skills.md](../../../docs/agents/cm-skills.md) under Auxiliary, next to
  `cm-archive-notes`, and its count line updated (currently reads "Eight `cm-*` skills").
- The nudge in [cm-implement](../../../.agents/skills/cm-implement/SKILL.md): when resolving a ticket
  leaves its effort with nothing open, suggest running `/cm-archive-effort`. A suggestion, never an
  automatic move — six efforts are stale today precisely because nothing prompts, but a folder move
  is too surprising a side effect for a session focused on shipping code.
- Whatever tool-exclusion changes ticket 03 calls for.

Done when `pnpm check:all` passes and the skill reads as a peer of `cm-archive-notes` rather than a
transcript of this map.
