# ADRs vs. `.agents/notes/implemented/architecture/` — coexist or replace?

Type: grilling


Status: resolved

Blocked by: None (can start immediately)

## Question

Going forward, does `.agents/notes/implemented/architecture/` replace `docs/adr/` for structural
decisions, do the two coexist (and if so, on what dividing line — e.g. ADRs for repo-wide/durable
structural calls, Agent Notes for everything else, including architecture calls scoped to one
effort), or does `docs/adr/` stay the sole home for `architecture`-class decisions and the other five
classes (`feature`, `bug-fix`, `simplification`, `process`, `testing`) are the only ones that
actually get new Agent Notes?

This has to be settled before `cm-setup` can be specified (ticket 05) and before `cm-wayfinder`'s
resolution step can be fully written (ticket 03), since both need to know where an `architecture`-
class decision actually goes.

## Answer

**Coexist**, on a scope/durability dividing line, not a topic dividing line:

- `docs/adr/` stays the sole home for **repo-wide, durable, system-shaping** structural decisions —
  the kind that outlive any single effort. This repo's 9 existing ADRs (match engine phases, Decider
  boundaries, calendar model, commentary templating, etc.) are all this shape: written once, no
  lifecycle, permanent record. This dividing line held up against the actual ADR corpus, not just in
  the abstract.
- `.agents/notes/{proposed,implemented,...}/architecture/` is for **effort-scoped** structural calls
  — decisions made in the course of one wayfinder map or one implementation effort that are too local
  or provisional to earn a permanent ADR, but still benefit from the `proposed → implemented`
  lifecycle tracking (tied to the ticket/spec that produced them, promotable, archivable).
- **Promotion path**: an `implemented/architecture/` Agent Note can later be promoted into a full ADR
  if it turns out to be repo-wide and durable after all. This is a **manual judgment call**, not a
  scripted/automated step — worth one sentence of documentation in `cm-wayfinder` and/or `cm-setup`,
  not its own ticket or tooling.
- The other five classes (`feature`, `bug-fix`, `simplification`, `process`, `testing`) have no ADR
  equivalent in this repo, so they're unambiguously Agent Notes territory — no dividing line needed.
