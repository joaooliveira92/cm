# Agent Note: `cm-implement`'s proposed→implemented promotion step

Status: proposed

## Problem

`cm-implement` ships the code for a spec whose decisions live as `proposed/{class}/` Agent Notes
(written earlier by `cm-wayfinder`'s resolve step). Nothing yet specifies how `cm-implement` finds
which notes belong to the spec/tickets it's building, rewrites each from future-tense `## Proposal`
to present-tense `## Decision` (per `reference-project`'s own proposed→implemented rewrite rule), and
moves the file from `proposed/{class}/` to `implemented/{class}/` — or whether this happens in the
same session/PR that ships the code versus a distinct follow-up step.

## Proposal

- **Discovery**: `cm-implement` never searches `.agents/notes/proposed/` for matching notes.
  `cm-to-spec`/`cm-to-tickets` must carry forward explicit links from the spec/ticket files to each
  `proposed/{class}/yyyy-mm-dd-topic.md` note the map's decisions produced, so `cm-implement` follows
  known links rather than guessing by keyword or date-range match. (The exact edit to
  `cm-to-spec`/`cm-to-tickets` that adds these links is a separate, not-yet-drafted follow-on;
  tracked as its own ticket.)
- **Promotion is the default, not a judgment call.** Once a linked decision fully ships as proposed,
  `cm-implement` always promotes: rewrites `## Proposal` into present-tense `## Decision`, folds
  `## Acceptance criteria`/`## Risks` into `## Consequences` (or a present-tense
  `## Testing`/`## Verification` section), updates `Status: proposed` → `Status: implemented`, and
  moves the file from `proposed/{class}/` to `implemented/{class}/`. The one skip case is **partial**
  implementation: if the shipped code only partly realizes the proposal, the note stays in
  `proposed/`, and the ticket/PR notes which part remains unbuilt. Divergence between what was
  proposed and what actually shipped is not a skip case — it's exactly what the rewrite reconciles,
  same as `reference-project`'s own rule requires.
- **Atomic with the shipping commit.** The promotion rewrite is its own step, inserted between
  "run the full test suite" and "commit your work" in `cm-implement`'s flow, so the promoted note
  ships in the same commit as the code — mirroring ticket 03's precedent (note-writing atomic with
  ticket resolution) and `reference-project`'s own MUST-same-PR rule for Agent Notes.

## Alternatives considered

- **`cm-implement` searches `.agents/notes/proposed/` by keyword/date-range instead of following an
  explicit link.** Rejected: fuzzy matching against free text is exactly the failure mode Agent Notes
  exist to avoid; an explicit link is unambiguous and cheap to carry forward.
- **Promotion as a separate follow-up pass, decoupled from the shipping commit.** Rejected:
  contradicts `reference-project`'s "same PR" rule and risks a shipped decision sitting stale in
  `proposed/` indefinitely if the follow-up pass is skipped.
- **Promotion as a judgment call (skip sometimes even on full implementation), mirroring
  note-worthiness in tickets 02/03.** Rejected: note-worthiness there gates whether a note is written
  at all (a one-time creation choice); once a note exists and its decision ships, promotion is
  mechanical bookkeeping, not a fresh editorial call — the only genuine exception is a decision that
  didn't fully ship.

## Acceptance criteria

- `cm-implement`'s SKILL.md contains an explicit step, positioned between running the full test suite
  and committing, that: follows linked `proposed/{class}/` notes from the spec/tickets it's building,
  rewrites each per the promotion rule above, and moves it to `implemented/{class}/` in the same
  commit — for every linked note whose decision fully shipped.
- A linked note whose decision only partially shipped is left in `proposed/`, with the gap recorded
  on the ticket/PR.

## Risks

- Depends on a not-yet-drafted edit to `cm-to-spec`/`cm-to-tickets` to actually carry the links
  forward; until that ships, `cm-implement`'s promotion step has nothing to follow.
- No mechanical gate (prose-only for v1, per the map's Notes) checks that promotion actually happened
  or that the rewrite followed the skeleton correctly — relies on the implementing session following
  the written step faithfully.
