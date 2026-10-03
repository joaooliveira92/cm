# Which per-player columns the stream backs

Type: grilling
Status: resolved
Blocked by: 01

## Question

The CM Club Stats table has 20 per-player columns ([01](01-cm-match-screen-inventory.md)). Under the
rule that a screen may derive from the Match Event stream but may not invent what the stream does not
contain ([note](../../../.agents/notes/implemented/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md)),
which columns does this game's per-player match table show, from which events, and how is each
counted?

## Answer

**Twelve columns, all folded from the stream. The other eight are absent rather than shown as
unavailable.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-10-03-the-match-player-line-folds-only-recorded-events.md).
