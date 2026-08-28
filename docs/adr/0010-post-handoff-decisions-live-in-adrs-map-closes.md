# Post-handoff implementation decisions live in the ADR layer; the map closes at handoff

## Context

The wayfinder map for `cm-clone` charted a route to a written spec, reached it (`spec.md`), and handed
off to `/to-spec` → `/to-tickets` → `/implement`. Implementation then surfaced a real decision the
map had not anticipated: ticket 19 refactored the match engine to consume resolved flat phase-slots,
and ticket 20 rewrote ADR-0002's boundary wording to match. Neither the upstream wayfinder skill nor
this repo had defined where such a mid-implementation decision should be recorded. The flat
`issues/NN-*.md` numbering space mixes original wayfinder decision tickets (01–08, which carry a
`Type:` line) with to-tickets build tickets (09–18) and follow-on decisions (19–20), all in the same
directory. We needed a durable home for post-handoff decisions and a clear lifecycle for the map once
its destination is reached.

## Decision

- **Post-handoff decisions live in the ADR layer** (`docs/adr/NNNN-*.md`), the durable decision
  record — the same home every resolved wayfinder decision already lands in. A fresh wayfinder
  mini-map is *not* the right shape: a map exists to chart a way that isn't yet visible, whereas a
  mid-implementation decision happens when the way is already charted and the planning instrument's
  job is done. The flat `issues/NN-*.md` numbering and the presence (or absence) of a `Type:` line
  remain exactly as they are; no new numbering/naming convention is introduced.
- **The map closes at handoff.** Once the map's destination (the spec) is reached and handed off,
  later implementation decisions do not reopen or extend it. They update the ADR layer (durable), and
  at most receive a continuity pointer in the map's **Decisions so far** (as tickets 19–20 just did)
  so the index stays honest. The map's **Not yet specified** fog was already carried into the spec's
  Out of Scope at handoff, so there is nothing left to chart.

## Consequences

- Implementation decisions get a single, searchable, durable home (the ADR layer) rather than being
  orphaned in the ticket numbering space or requiring a heavyweight fresh map.
- The wayfinder map is unambiguously a planning artifact with a defined end, not a perpetually-open
  index that accretes build-era noise.
- The mixed `issues/NN-*.md` numbering is accepted as-is; the `Type:` line (wayfinder tickets) versus
  its absence (to-tickets build tickets) remains the only discriminator. This is a known, accepted
  ambiguity, not a defect to fix.
- A decision that is large enough to need its *own* route-finding (a genuine, non-obvious way to a new
  destination) still warrants a fresh wayfinder map — this ADR only governs decisions that surface
  while building an already-charted destination.
