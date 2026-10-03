# Record what is rolled, or simulate new actions?

Type: grilling
Status: resolved
Blocked by: 01

## Question

For each statistic the CM columns want, does the engine (a) record a fact it already decides, (b)
attribute an already-decided team-level fact to a named player, or (c) simulate a new action that can
change what happens next (a tackle that ends an attack, an interception that flips possession)? Option
(c) changes outcomes and balance; (a) changes nothing but the timeline; (b) sits between. The rule from
[the match model shows only what it produces](../../../.agents/notes/implemented/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md)
says numbers with no consequence are decorative. Which category does each statistic go in, and is
"decorative but recorded" acceptable when the decision behind it was really made?

## Answer

**Record decided facts and attribute decided team-level facts; simulate nothing new. Passes, completion
and key headers are ruled out because nothing in the engine decides them.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-10-03-the-engine-records-decided-facts-not-new-actions.md).
