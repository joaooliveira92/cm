# Archival: separate cm-archive-notes skill, or documented convention only?

Type: grilling
Status: resolved

Blocked by: 05

## Question

`reference-project`'s `dsh-archive-agent-notes` is a full skill (supersession checks, archival
judgment, hash-pinned manifest via a script). Given prose-only enforcement for v1 (no manifest/hash
script), does archiving become its own `cm-archive-notes` skill carrying the judgment criteria in
prose, or does that guidance just live inline in `cm-setup`'s / `cm-wayfinder`'s docs without a
dedicated skill? Also: does the `archived/manifest.json` hash-pinning concept get adopted at all in a
prose-only world, or dropped (freezing enforced by convention — "never edit an archived note" — not
tooling)?

## Answer

1. **Dedicated `cm-archive-notes` skill.** `dsh-archive-agent-notes`'s judgment weight — a
   write-time supersession check, a five-way classify-by-future-value taxonomy (implemented-keep,
   implemented-archive, proposed-never-archive, rejected-keep-as-guardrail, rejected-delete), and a
   page of calibrated examples that make the taxonomy legible — is too much prose to bury as a
   subsection of `cm-setup`'s or `cm-wayfinder`'s docs. `cm-archive-notes` carries a trimmed version
   of that taxonomy, invoked explicitly ("audit/archive Agent Notes").
2. **`manifest.json` hash-pinning dropped entirely for v1.** Freezing an archived note is a stated
   prose convention only ("never edit, move, or reformat a note once archived"), consistent with the
   map's existing prose-only-enforcement Note. Revisit if scripted enforcement is ever added later.
3. **Two-tier split for the supersession check.** `cm-wayfinder`'s resolution step (ticket 03) gets
   one added line: check/flag whether the new note supersedes an existing active note on the same
   decision. The full judgment taxonomy (archive-vs-retain, calibrated examples) lives only in
   `cm-archive-notes`, invoked periodically or on that flag — not duplicated into `cm-wayfinder`'s
   docs.
4. **Rejected-note deletion stays in scope for v1**, done as a reviewed, deliberate action in a
   normal PR — git history is the audit trail, same as any other deletion in this repo — rather than
   gated on tooling that doesn't exist.

Domain-modeling check: none of this terminology (supersession check, the five classify outcomes,
sealed/frozen semantics) touches `CONTEXT.md` — that glossary is scoped to the Championship Manager
game domain (players, attributes, match engine), not agent tooling. This vocabulary belongs in
`docs/agents/notes.md` (already scoped by ticket 05) instead. No ADR warranted: this is a documented
process convention, not a hard-to-reverse game-domain architecture call, and it's fully captured here.
