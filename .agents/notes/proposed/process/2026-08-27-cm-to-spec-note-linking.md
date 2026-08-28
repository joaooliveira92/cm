# Agent Note: Carry forward explicit links from spec/ticket files to their Agent Notes

Status: proposed

## Problem

`cm-implement`'s promotion step (see [Agent Note](2026-08-27-cm-implement-promotion-step.md)) follows
explicit forward-links from the spec/tickets it's building to each `proposed/{class}/` Agent Note the
map's decisions produced, rather than searching `.agents/notes/proposed/` by keyword or date-range.
Nothing yet specifies where those links appear in `cm-to-spec`'s generated spec or `cm-to-tickets`'
generated tickets, what format they take, or how a spec/ticket that collapses multiple map decisions
(each possibly backed by its own note, or none) represents multiple links without becoming unreadable.

## Proposal

- **`cm-to-spec`'s "Implementation Decisions" section**: for each implementation decision drawn from a
  resolved `cm-wayfinder` ticket that produced a `proposed/{class}/` note, the decision's bullet ends
  with that ticket's own gist+link sentence, copied verbatim rather than re-derived prose — the same
  gist-then-link shape used throughout this convention (map Decisions-so-far, ticket `## Answer` per
  [ticket 02](../../../../.scratch/skill-suite-merge/issues/02-ticket-note-relationship.md)). A
  decision whose source ticket carried no note (a scoping/fact-only/abandoned answer, per ticket 02's
  note-worthiness test) is stated in plain prose with no link — not every decision has one.
  One decision, one bullet, one link: never fold two notes' gists into a single paragraph or a shared
  link, even when both came off the same map.

- **`cm-to-tickets`' per-ticket template**: both the local-file template and the issue template gain a
  new `## Decisions` section, positioned immediately after `**What to build:**` / `## What to build`
  and before `**Blocked by:**` / `## Acceptance criteria`. It lists one bullet per `proposed/{class}/`
  note the ticket implements, each as `- <gist>. See [Agent Note](<path-or-link>).` — gist+link copied
  verbatim from the source wayfinder ticket's `## Answer`, not re-summarized. A ticket that realizes
  several map decisions at once lists several bullets, each with its own link; a ticket with no
  linked decisions (pure scaffolding/prefactoring work with nothing to promote) omits the section
  entirely rather than leaving it empty.

- **Local vs. real tracker**: on the local-markdown tracker the link is a relative path
  (`.agents/notes/proposed/{class}/yyyy-mm-dd-topic.md`); on a real tracker it's whatever URL the note
  lives at (the note file itself doesn't move to the tracker, only the spec/ticket text references it).
  The link target and format don't change based on tracker — only how the surrounding issue is filed
  does, consistent with the rest of `cm-to-tickets`.

## Alternatives considered

- **A single "Related Decisions" appendix at the end of the spec/ticket, listing all links together.**
  Rejected: separates each link from the decision it backs, forcing a reader to cross-reference by
  position; the inline gist+link (used everywhere else in this convention) keeps decision and evidence
  adjacent.
- **`cm-implement` searches `.agents/notes/proposed/` by keyword/date-range instead.** Already rejected
  in ticket 04/its note — explicit links are the whole point this ticket exists to specify.
  Re-affirmed here rather than re-litigated.
- **Merge multiple decisions from the same map into one combined bullet with one link picked as
  "primary."** Rejected: silently drops the other notes from the spec/ticket, breaking
  `cm-implement`'s promotion step for the dropped ones.

## Acceptance criteria

- `cm-to-spec`'s SKILL.md "Implementation Decisions" section instructs the model to append each
  note-backed decision's gist+link, verbatim from the source ticket, one bullet at a time.
- `cm-to-tickets`' SKILL.md local-ticket-template and issue-template both gain a `## Decisions` /
  `**Decisions:**` section between "What to build" and "Blocked by"/"Acceptance criteria", with the
  one-bullet-per-note rule stated explicitly.
- A spec or ticket covering N map decisions with notes shows N distinct gist+link bullets, never fewer.

## Risks

- Depends on ticket 02/03's gist+link convention staying stable; if that shape changes, both
  `cm-to-spec` and `cm-to-tickets` need matching edits.
- No mechanical gate (prose-only for v1, per the map's Notes) checks that every note-backed decision
  actually got linked — relies on the generating session following the written step.
