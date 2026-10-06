# Map: Post-match press conference

Label: `wayfinder:map`

## Destination

A spec in this effort's directory, ready for `cm-to-tickets`, for a
flavour-only press conference the manager faces on Match day after accepting their own Fixture's
result.

## Notes

**Domain**: local single-player football-management sim, Electron + event-sourced Effect domain
layer.

**This is a reversal, scoped narrowly.** It overturns part of Group M's
[v1 exclusion](../group-m-media-press-and-communications/issues/02-v1-scope.md) as a fresh effort, as
that ticket's answer requires. Screen 182's post-match case is the only part that enters v1. The
first code commit must also amend CONTEXT.md (**Calendar**, **Influence**, a new **Press
Conference** term) and Group M's `RECONCILIATION.md` row for 182. The Agent Note from ticket 01 lists
the exact edits.

**Continue must never depend on the panel.** The conference was asked for alongside a report that
Continue went missing after Accept. That report could not be reproduced on 2026-10-06, but every
ticket here treats "Continue visible and enabled after Accept" as an invariant.

**Skills**: `grilling` and `domain-modeling` for grilling tickets; `prototype` for the panel;
`research` for ticket 02; `effect-code` once the spec reaches implementation.

## Decisions so far

- [01: Does the post-match press conference overturn Group M's v1 exclusion, and how far?](issues/01-reverse-the-media-exclusion-for-the-post-match-press-conference.md):
  only the post-match conference enters v1, as flavour. It appears automatically after Accept and
  never blocks Continue (pressing Continue skips it). Questions are deterministic templates, 2–4 per
  conference, each with three answers in different tones. An answered conference is one match-stream
  event, read back as a `result` News Message. A skip records nothing; a pending conference does not
  survive a restart; there is no Pillar binding.

## Not yet specified

- **The News Message for a conference**: subject and body copy, priority, and how a transcript of
  two to four exchanges reads in the message pane. Waits on tickets 03 and 05.
- **Keyboard and focus**: where focus lands when the panel appears after Accept, and how it coexists
  with the bottom bar's Continue. Waits on ticket 04.
- **Test seams**: which e2e journeys gain a conference step, and how the advance helpers in
  `boundary-helpers.ts` treat an unanswered conference.

## Out of scope

- **A consequence model** (morale, manager reputation, board opinion, relationships). Its own effort;
  the recorded events exist so it can read history.
- **An Influence binding on the conference.** Only meaningful once consequences exist.
- **Pre-match press conferences, interviews, statements, rumours, Media Centre, and the rest of
  Group M.** Still out of v1 per Group M's ticket 02.
- **Named journalists and outlets.** No relationship model to give them meaning.
- **A `media` News Category.** Revisit if media grows beyond one message kind.
- **Persisting an unanswered conference across restarts.**
