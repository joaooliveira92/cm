# 03 — Blanket scope trim across the Group A specs

Type: task
Status: resolved
Blocked by: 02

## Question

The out-of-scope axes are already settled on the map — multiplayer, network, cloud sync, ownership,
multiple managers, worker pools, memory budgets. What is not known is **how much of each spec file they
actually consume**, and which sections survive once they're cut.

Produce, in the register format from ticket 02, the trim across all 21 Group A spec files: every section
ruled out, attributed to a named out-of-scope axis. One pass over the corpus, mechanical where possible.

The output is the input to every audit ticket and to the four new-screen design tickets: those sessions
should be reading only what survived, not re-deciding the trim for themselves.

Expect this to also surface axes charting missed. New axes get added to the map's Out of scope with a
reason, not silently trimmed.

## Done when

Each of the 21 spec files has its surviving sections identified, and the map's Out of scope lists every
axis actually used.
## Answer

**Trim recorded as `out-of-scope` rows across all 21 screens in the ledger; far narrower than expected,
and Screen 7 disappears entirely.** See [Agent Note](../../../.agents/notes/proposed/process/2026-08-30-group-a-blanket-scope-trim.md).
