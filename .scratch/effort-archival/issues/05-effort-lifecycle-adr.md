# ADR: the effort directory lifecycle after handoff

Type: task
Status: open

Blocked by: 01, 02, 03

## Question

Write the ADR recording the effort-lifecycle convention, as the extension to
[ADR-0010](../../../docs/adr/0010-post-handoff-decisions-live-in-adrs-map-closes.md) that this whole
effort exists to supply.

ADR-0010 decided that the map closes at handoff and that post-handoff discoveries are classified by
type (architectural decisions to the ADR layer, spec corrections to the spec, gameplay/UX to feature
records, new destinations to a fresh map), but said nothing about what physically becomes of the
effort directory afterward — which is
why six complete efforts still sit in top-level `.scratch/`. This ADR states the answer: `.scratch/`
holds live efforts only, complete efforts move to `.scratch/archived/<effort>/`, and the move is a
reviewed judgment call rather than an automatic consequence of the last ticket closing.

The three-part ADR test holds: it is hard to reverse once ~100 inbound links are rewritten,
surprising without context to anyone who finds an `archived/` tree, and the result of a real
trade-off against deleting the directories outright — Agent Notes and ADRs hold the durable
decisions, but specs are still cited as live authority, which is what defeats deletion.

Record the alternatives actually weighed while charting this map: delete outright, move out of
`.scratch/` entirely into `docs/`, condense each effort to a closure summary, and forward-only with
no retrofit. Cross-reference ADR-0010 rather than restating it.
