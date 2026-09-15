# 08 — Assemble the spec

Type: task
Status: resolved

Blocked by: 07

## Question

Assemble `.scratch/club-selection/spec.md` from the resolved tickets, in the shape
`/cm-to-spec` → `/cm-to-tickets` expects.

The spec covers the two-column workspace, the club list and its rows, the detail panel and its
contract, the degenerate league selector, `Pick a team for me`, the selection state carried on
`CreationSession` through to `commitCareer`, and the keyboard and accessibility commitments.

Every decision already lives in a ticket and its Agent Note; this ticket assembles, it does not
decide. Anything that turns out to still need deciding is a new ticket on the map, not a
judgement call made here.

## Answer

The spec is assembled at `.scratch/club-selection/spec.md`, in the shape `/cm-to-spec` →
`/cm-to-tickets` expects, `Status: ready-for-agent`. It is sourced from tickets 01–07 and their
six Agent Notes: the two-column workspace shape, the world-bound selection record, the compact
squad readout over one payload, the degenerate league selector, the unseeded exclusion-rolled
pick assist, and the level-2 listbox keyboard tier. Each Implementation Decision bullet ends with
its source ticket's gist-link copied verbatim; the Screen 11 reconciliation restatement (ticket
07) is carried as a normative instruction because the register edit ships with the code, and is
the one decision with no note. The out-of-scope work, plus the parts of the map's fog that sat
past the destination (virtualization, visual-design-language alignment), are recast in the
spec's Out of Scope with the map its source.

No Agent Note is written: this ticket assembled artifacts, it did not assert a new decision —
the durable propositions already live in the six notes, and this ticket's own product is the
spec.

Map consequence: assembling the spec confirmed that ticket 09 (changing league scope after
generation) sits beyond this destination — the regenerate-or-freeze, abandonment-race, and
confirmation questions are generation-lifecycle ones for the effort that honours the snapshot,
not Club Selection screen work. It is ruled out of scope (closed) and recorded on the map's
Out of scope section accordingly.
