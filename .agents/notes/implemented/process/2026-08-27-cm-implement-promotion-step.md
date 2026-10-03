# Agent Note: `cm-implement`'s proposed→implemented promotion step

Status: implemented

## Problem

`cm-implement` ships code whose decisions may live as `proposed/{class}/` Agent Notes, written
earlier by `cm-wayfinder`'s resolve step. Something has to say how `cm-implement` finds the notes
that belong to the work, and what it owes them once the code ships: a rewrite into
`implemented/{class}/`, and whether that rewrite must land with the code.

## Decision

- **Discovery follows links, never search.** `cm-implement` follows the explicit links that
  `cm-to-spec` and `cm-to-tickets` carry forward (the spec's Implementation Decisions bullets, the
  tickets' Decisions sections), plus the note links in source comments of the files it touches. It
  never matches notes by keyword or date range.
- **A contradicted note is updated in the same change.** If what shipped departs from a linked
  note, the note is rewritten to match before the work is committed. This is the one obligation.
- **Promotion is optional and unhurried.** When a linked decision fully ships, the implementer may
  promote the note: rewrite `## Proposal` as a present-tense `## Decision`, fold
  `## Acceptance criteria` and `## Risks` into `## Consequences`, flip the status line, and move the
  file to `implemented/{class}/`. It need not share the shipping commit. Notes left in `proposed/`
  after their code ships get reconciled in a `cm-archive-notes` pass.

## Alternatives considered

- **Keyword or date-range search of `proposed/`.** Rejected: fuzzy matching against free text is
  the failure mode notes exist to avoid, and an explicit link is cheap to carry.
- **Mandatory promotion in the shipping commit.** This was the rule from 2026-08-27 to 2026-09-27,
  modelled on a reference project's same-PR requirement. It was dropped because every feature
  commit then carried note bookkeeping, and about one commit in seven in the month before touched
  only `.scratch/` or `.agents/notes/`. The cost it guarded against, a shipped decision sitting in
  `proposed/`, is a labelling problem a periodic `cm-archive-notes` pass fixes. A note that is
  *wrong* is the real hazard, and the contradicted-note rule covers that directly.
- **No notes obligation at all in `cm-implement`.** Rejected: code that silently diverges from a
  linked note leaves a false record that the next agent trusts.

## Consequences

- `proposed/` holds a mix of unbuilt and shipped decisions between archive passes. A reader who
  needs to know whether a proposal shipped checks the code, not the folder.
- Nothing mechanical checks that contradicted notes get updated; it relies on the implementer
  following the step. The policy is stated in `AGENTS.md` § When to use the process and in
  [docs/agents/notes.md](../../../../docs/agents/notes.md).
