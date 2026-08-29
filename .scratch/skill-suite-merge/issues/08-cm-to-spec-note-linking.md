# Carry forward explicit links from spec/ticket files to their Agent Notes

Type: task
Status: resolved

Blocked by: None (can start immediately)

## Question

Ticket 04's answer requires `cm-to-spec`/`cm-to-tickets` to carry forward explicit links from the
spec/ticket files they produce to each `proposed/{class}/yyyy-mm-dd-topic.md` Agent Note the map's
decisions produced, so `cm-implement`'s promotion step can follow known links instead of searching
`.agents/notes/proposed/` by keyword or date-range.

Draft the exact replacement text for the relevant step(s) of `cm-to-spec` (its "Implementation
Decisions" section, which today just restates the map's Decisions-so-far gists as prose) and/or
`cm-to-tickets` (per-ticket "Blocked by"/body template), specifying: where in each generated file the
link(s) appear, what format they take (mirroring the gist-then-link shape used everywhere else in
this convention — map Decisions-so-far, ticket `## Answer` per ticket 02), and how a spec/ticket that
collapses multiple map decisions (each possibly with its own note, or none) represents multiple links
without becoming unreadable.

## Answer

**One bullet per decision, gist+link copied verbatim from the source ticket's `## Answer`, never merged even when several decisions share a ticket or a map.** See [Agent Note](/.agents/notes/proposed/process/2026-08-27-cm-to-spec-note-linking.md).
