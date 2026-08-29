# What makes an effort archivable

Type: grilling
Status: open

Blocked by: None

## Question

What does `cm-archive-effort` check before proposing an effort as a candidate, and what does it show
the human so they can confirm or reject it?

The shortlist is mechanical, the gate is judgment — but the shortlist still has to compute something,
and the current corpus makes every naive predicate wrong in a different way:

- `effect-lint-hardening` reads 2/2 tickets resolved on disk, yet [roadmap.md](../../../docs/roadmap.md)
  records ticket 02 as claimed-but-unanswered. Disk state overstates completion.
- `cm-clone` is 19/20: ticket 09 is honestly `ready-for-human`, blocked on a maintainer call about the
  `@effect/rpc` shim. One legitimately-open ticket in an otherwise shipped effort.
- `injury-system` has no `map.md` at all and 0/9 tickets resolved, so any map-state signal is absent.
- `training` is 5/5 resolved with a `ready-for-agent` spec — design complete, but no code has shipped.
  Is that archivable, or does archival require the destination to have been *reached* rather than
  merely charted?

Concretely: which signals feed the shortlist (ticket statuses, checkbox state, map fog emptiness,
spec status, Agent Note promotion state, git evidence of shipped code)? How do they combine? What
does the skill do with a near-miss like `cm-clone`'s single open ticket — exclude it, or surface it
as a candidate with the exception called out? And is "destination reached" the criterion, or
"nothing left to decide"?
