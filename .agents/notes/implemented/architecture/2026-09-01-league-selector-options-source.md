# Agent Note: The league selector sources a named, inert, single-option control

Status: implemented

## Problem

The Club Selection workspace carries a league selector (ticket 01's shape), but the world has no
league dimension to source it from. There is no `competitions` or `leagues` table; `clubs`
(`id, name, stature_tier, is_user_club, generation_seed`) has no league foreign key; and
`getClubSelection` reads `FROM clubs` with nothing to filter by. The one generated League — the
fixed 20-club fictional set from `LEAGUE_CLUBS` — has no name anywhere.

Only one league identity exists in the creation flow: the `LeagueSelectionSnapshot` on
`CreationSession`, which records the player's intended scope, not what generation materialized.
World generation does not honour it: `beginCareer` generates only the fixed 20-club League
regardless of scope (CONTEXT.md "Generation boundary, as of 2026-08-31").

The selector was already settled as **degenerate by design** — correct in shape, single-option
today, so it becomes right rather than new when multi-league generation lands. That still leaves
four questions without an answer: where the single option comes from, what selecting it does with
exactly one League in the world, whether the `ClubSelectionRow` contract changes now, and how a
single-option control is presented without the single-option accessibility trap.

## Decision

### The selector reads the generated world's one League, named by a new shared constant

The single option is **not** sourced from the `LeagueSelectionSnapshot`. The snapshot records
intent, and generation does not honour it: reading the playable competitions off the session would
populate the selector with competition names (e.g. "Exampleland Premier Division") above fictional
clubs that are not in them, and filtering by them could only ever produce an empty list. That is
actively dishonest about the world.

Instead the option names the one generated League, and the label comes from a new shared constant
beside `LEAGUE_CLUBS` in `packages/shared/src/clubs.ts` — `LEAGUE_NAME`, a fully fictional proper
noun consistent with the world's naming. The generated League is the career's home, so it gets a
name rather than a neutral descriptor (token). The exact string is a replaceable content fixture,
the same status `LEAGUE_CLUBS` itself carries; the decision is that the name is shared content, not
that this specific string is permanent.

### Selecting it is inert while the world holds one League

Every generated club belongs to the one League, so no selection can change the club list. The
control must not pretend otherwise: it is **inert chrome** — present, correct in shape, and not
wired to filtering until there is more than one League to choose between. A no-op that visibly
changes and is ignored, or a tautological filter against a singleton attribution, is a UI that lies.
Ticket 01's panel "league summary" is computed from the club list itself and needs no attribution,
so nothing else requires the filter to exist.

### `ClubSelectionRow` does not gain a league field

No `leagueId` / `leagueName` is added to the contract now. Two reasons, not one:

- **It is dead weight until generation is multi-league.** Every row would answer identically.
- **It would pre-decide the league-identity scheme that world generation owns.** An id/name
  invented on this screen to stand in for the league becomes a contract field other code can consume
  and rely on, and it may not match the canonical scheme generation introduces when it builds
  leagues. Extending the wire contract ahead of that effort is scope creep into the out-of-scope
  multi-league work; the degenerate selector does not need the field to be inert.

Retrofitting the field when multi-league generation lands is a contained, owned change: it touches
the row contract, the `getClubSelection` query, and the row's consumers, all in this same small
surface. That is the trigger; this ticket is not it.

### Presented as a disabled native `<select>`, not the accessibility trap

A native `<select>` with a single option reads as interactive and is not — a common accessibility
trap (a screen-reader announces a one-option control as if it could be changed). The control ships
as a **disabled native `<select>`** with a persistent `<label>` and `aria-describedby` helper text
exposing why it is disabled and what will enable it. Disabled is properly exposed to assistive
technology, unlike a fake-enabled control, and the control shape is exactly what becomes real when a
second league exists — the field flips from disabled to enabled rather than being redesigned.

The fallback if a disabled `<select>` clashes with the workspace's visual language is a static,
non-interactive read-only readout ("League" + the name) — honest, but further from the future shape
than the disabled control.

## Alternatives considered

- **Read the snapshot's playable competitions.** Rejected: the snapshot records intent, not the
  world; generation does not honour it. It would show competitions the career will never contain
  above clubs that are not in them.
- **A no-op selector that changes and is ignored, or a filter against a league constant.** Rejected:
  two ways of letting the UI assert something false about what the control does.
- **Extend `ClubSelectionRow` with a league field now.** Rejected on the dead-weight and
  identity-scheme-ownership grounds above; the cost framing "low today, bounded retrofit later,
  decisive in the multi-league effort" puts the field in that effort, not this one.
- **An enabled single-option `<select>`.** The accessibility trap; rejected.
- **A static read-only readout as the primary presentation.** Kept as a fallback only; the disabled
  native control is the better shape because it is the future enabled state.
- **A neutral descriptor ("Top Division") for the label.** Rejected: a descriptor reads unfinished
  next to proper-noun competition names the setup screens already use; the league is where the whole
  career plays, so it gets a name.

## Consequences

What shipped:

- The selector on the Club Selection screen shows exactly one option, labelled with `LEAGUE_NAME`
  from `packages/shared/src/clubs.ts`, never from the `LeagueSelectionSnapshot` and never hardcoded
  in the renderer.
- The control is a disabled native `<select>` with a persistent `<label>` and an
  `aria-describedby` helper text explaining why it is disabled.
- Interacting with the selector has no effect on the club list, because there is nothing to filter
  by; the control is rendered but functionally inert.
- `ClubSelectionRow` / `ClubSelectionView` and `getClubSelection` gain no league field or column.
- The panel league summary (club count, stature tier distribution) still derives from the club list
  itself with no new wire field.

What it costs:

- **The name is invented here but `LEAGUE_CLUBS` is the same class of content.** If the world's
  naming is later relocated or retuned, `LEAGUE_NAME` must move with `LEAGUE_CLUBS`; the note pins
  both to `packages/shared/src/clubs.ts` so they do not drift.
- **"Inert" can silently become "wrong" when a second league lands.** The commit that makes
  generation multi-league must wire the selector to real attribution and re-enable it in the same
  change; until then the control staying disabled is the honest state, and nothing should re-enable
  it early.
- **A disabled control can read as "broken" to a user who does not see a league dimension at all.**
  The helper text is the mitigation; without it, the control is a native `<select>` that never does
  anything with no explanation.

## Related

- Ticket: `.scratch/club-selection/issues/04-league-selector-options-source.md`
- The workspace shape that places this control, and the panel league summary it sits beside:
  [The Club Selection two-column workspace](2026-09-01-club-selection-workspace-shape.md)
- The contract stance the no-field decision continues (one payload, no per-club RPC):
  [The club detail panel is a compact squad readout over one payload](2026-09-01-club-detail-contract.md)
- The snapshot-vs-world distinction this leans on, and the generation boundary it records:
  [League and Nation Selection](../feature/2026-08-31-league-and-nation-selection.md)
