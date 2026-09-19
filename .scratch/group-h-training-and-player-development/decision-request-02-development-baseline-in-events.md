# Decision Request: Should `PlayerDeveloped` record the Attributes a player had before development?

## Question

Should future `PlayerDeveloped` events carry the player's Attributes before that Season's development
as well as after, so the Performance Report can show a player's changes from their first Season?

## Why this is blocking

Found in ticket 07 review. `PlayerDeveloped` stores only the outcome Attributes
(`apps/desktop/src/main/club/development.ts`), and no table keeps a starting snapshot. The Performance
Report can therefore only diff one concluded Season against the previous one, so every player's first
recorded Season shows no changes. In a new career the report is empty of progress until Season 2
concludes.

Changing an event payload is a persistence and save-compatibility decision (ENGINEERING-CONTRACT
§ Persistence), not an implementation detail.

## What is already settled

- CONTEXT.md **Player Development**: deterministic, applied when the Season concludes. A persisted
  Current Ability aggregate is rejected.
- Ticket 07 ships development progress as season-over-season Attribute diffs from existing events.
- Regenerating the world from `generation_manifest.world_seed` is not a baseline source: it covers
  only players present at generation and depends on the generator version.

## Options

### Option A — Add the pre-development Attributes to new `PlayerDeveloped` events

- **What the player experiences**: changes appear from the first concluded Season in new careers and
  from the next concluded Season in existing saves.
- **What it costs to build**: an optional field on the event schema, written by `developPlayer`'s
  caller; `seasonDevelopments` prefers it over the previous Season's outcome.
- **What it forecloses**: nothing.
- **Save compatibility**: old events stay outcome-only and still decode (optional field); no
  migration.

### Option B — Keep outcome-only events

- **What the player experiences**: the first recorded Season always reads "no earlier Attributes to
  compare with".
- **What it costs to build**: none.
- **What it forecloses**: nothing.
- **Save compatibility**: unchanged.

## Recommendation

Option A. It is a small, backward-compatible payload addition, and without it the report looks broken
for a whole Season in every new career.

## What is blocked, and what is not

- Blocked: first-Season progress on the Performance Report (ticket 07) and anything in ticket 08 or 09
  that shows it.
- Proceeding meanwhile: ticket 07 ships season-over-season diffs; tickets 08 and 10 are unaffected.

---

## Answer — Option A, 2026-09-19

**New `PlayerDeveloped` events carry the pre-development Attributes.** A small, backward-compatible
payload addition, and without it every new career's report looks broken for a full Season.

Two consequences the option text left implicit, both of which must be visible rather than assumed:

- **It cannot be backfilled.** The pre-development Attributes of an already-recorded Season are genuinely
  absent, not merely expensive to recover. Existing saves keep their blind first Season.
- **So the report needs an explicit no-comparison state** for any Season whose event predates this change
  — not an empty table. Ticket 08 already established that pattern for the Development Centre; Screen 113
  reuses it.

The fix also gets no cheaper by waiting: every Season that concludes before it lands is another Season
that can never show its changes.

Settled with request 01 as
[the Performance Report shows what it can prove](../../.agents/notes/proposed/feature/2026-09-19-the-performance-report-shows-what-it-can-prove.md).
Decided under the human's standing delegation ("i need you to solve the decisions").
