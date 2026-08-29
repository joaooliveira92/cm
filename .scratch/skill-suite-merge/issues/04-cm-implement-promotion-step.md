# Design cm-implement's proposed→implemented promotion step

Type: grilling


Status: resolved

Blocked by: 03

## Question

When `cm-implement` ships the code for a spec whose decisions live as `proposed/` Agent Notes, how
does it: (1) find which notes belong to the spec/tickets it's building, (2) rewrite each from
future-tense `## Proposal` to present-tense `## Decision` (folding `## Acceptance criteria`/`## Risks`
into `## Consequences`, per `reference-project`'s own proposed→implemented rewrite rule), and (3)
move the file from `proposed/{class}/` to `implemented/{class}/` — in the same session/PR that ships
the code, or as a distinct follow-up step?

## Answer

**Discovery via explicit forward-links (not search), promotion is the default with partial-shipment
as the one skip case, atomic with the shipping commit.** See [Agent Note](/.agents/notes/proposed/process/2026-08-27-cm-implement-promotion-step.md).
