---
name: cm-implement
description: "Implement a piece of work based on a spec or set of tickets, promoting each linked proposed Agent Note to implemented as part of the same commit."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Promote each linked Agent Note. Follow the explicit forward-links carried in the spec's
"Implementation Decisions" bullets (from `cm-to-spec`) or the tickets' "Decisions" sections (from
`cm-to-tickets`) to each `.agents/notes/proposed/{class}/yyyy-mm-dd-topic.md` note they reference.
Never search `.agents/notes/proposed/` by keyword or date-range — only follow known links.

For every linked note whose decision fully shipped, promotion is the default, not a judgment call:

- Rewrite `## Proposal` into present-tense `## Decision`.
- Fold `## Acceptance criteria`/`## Risks` into `## Consequences` (or a present-tense
  `## Testing`/`## Verification` section).
- Flip `Status: proposed` to `Status: implemented`.
- Move the file from `.agents/notes/proposed/{class}/` to `.agents/notes/implemented/{class}/`.

The one skip case is **partial** implementation: if the shipped code only partly realizes the
proposal, leave the note in `proposed/` and note on the commit/PR which part remains unbuilt.
Divergence between what was proposed and what actually shipped is NOT a skip case — it's exactly
what the rewrite reconciles.

This promotion rewrite happens in the same commit as the shipped code, atomic, not a deferred
follow-up pass. There is no mechanical gate checking that promotion happened correctly (prose-only
for v1, per `docs/agents/notes.md`) — this relies on the step being followed faithfully.

Once done, use /code-review to review the work.

Commit your work to the current branch.
