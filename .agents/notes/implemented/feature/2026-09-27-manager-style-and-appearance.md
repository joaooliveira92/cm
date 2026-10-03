# Agent Note: A manager's style and appearance are creation-time preferences

Status: implemented

## Problem

Retiring the archetype picker left the Manager step's second half with only the Pillar allocation.
The manager had a name, a nationality, a date of birth, and a favorite club, but no visual identity
and no stated tactical direction. Their first Tactic opened on the screen default (4-4-2, balanced)
regardless of who they were, and there was no way to give the manager a face or a philosophy at
creation.

Filling that gap raised four structural questions: how appearance is stored, whether a "play style"
needs its own model, where the tactical preference is applied, and how the wizard gates on the new
choices.

## Decision

### Appearance is flat columns plus a code-generated fallback

`manager_profile` gained `avatar_portrait_key` (`TEXT`, nullable), `avatar_primary_color`, and
`avatar_secondary_color` (`TEXT`, hex). No JSON blob: the save schema is normalized, and a blob
would be the first of its kind with no reader that needs the flexibility. `avatar_portrait_key` is
reserved for a portrait asset set that does not exist yet, so it stays null; the two colours are the
accent scheme a colour/initials fallback renders, and they always have a value.

The panel offers a fixed palette of six two-tone swatches rather than a colour wheel: contrast is
guaranteed by construction, no colour dependency is added, and a swatch is a stable test target.

### Tactical style is a preset over the Tactic's own axes, not a table

`preferred_formation` is one of `FORMATIONS`; `preferred_style_id` is one of a new
`TACTICAL_STYLE_PRESETS` enum in `@cm-clone/shared` (`gegenpress`, `tiki_taka`, `catenaccio`,
`direct`, `possession`, `balanced`). Each preset maps, via `TACTICAL_STYLE_DEFAULTS`, to a
`(mentality, tempo, pressing)` triple drawn from the Tactic's existing axes.

There is no `tactical_styles` table and no style column on `tactics`. Nothing reads a style row at
runtime — the engine never sees "Gegenpress" — so a table would be a mirror with no reader. The
durable fact is the manager's preferred preset id, and the axes are derived from it. The DB `CHECK`
constraints import `FORMATIONS` and `TACTICAL_STYLE_PRESETS` rather than restating them, so a value
added in shared cannot drift from the constraint. Display names ("Gegenpress") are renderer-local
vocabulary, matching the Archetype-label precedent.

### The style seeds the editor, never the commit

A new career still persists no Tactic. `commitCareer` writes the five new columns and nothing else;
the `no-tactic` `MatchNotReadyError` onboarding blocker is unchanged. `useTacticDraft` reads the
manager's preferences and, when the loaded career has no Tactic, seeds the editor's initial draft
with `tacticSeedFor(preferredFormation, TACTICAL_STYLE_DEFAULTS[preferredStyleId])`. It waits for
the profile before seeding, so the first paint is the manager's Tactic rather than a placeholder
that never re-seeds.

### The two required preferences start unset

`preferredFormation` and `preferredStyleId` are `null` in a new creation session. The panel cannot
advance until both are chosen, and the commit refuses without them. One shared predicate
(`managerStyleComplete`, alongside `personalDetailsComplete` and the pillar sum) gates the shell
bottom bar and the in-panel stepper alike, so the two cannot disagree; `ManagerSubStep` grew to
`1 | 2 | 3`, and `CreationStepper` moved from a single `canAdvance` boolean to a `canReach(step)`
function so three steps do not all unlock at once.

## Alternatives considered

- **Store appearance as a JSON `avatar_config` blob.** Rejected: the schema is normalized, and the
  blob has no reader that needs it.
- **A `tactical_styles` lookup table.** Rejected: a mirror with no runtime reader; the axis mapping
  is code.
- **Free-text nationality-style play style, or a new `style` column on `tactics`.** Rejected: the
  style is a manager preference, not a property of a Tactic, and the Tactic's axes already carry the
  consequence.
- **Seed a full Tactic at `commitCareer`.** Rejected: it reverses the standing empty-start decision
  and removes the `no-tactic` onboarding gate for new careers.
- **A colour wheel for avatar colours.** Rejected: unguaranteed contrast, an added dependency, and a
  harder test target than a fixed palette.
- **Keep `preferred_formation`/`preferred_style_id` on `manager_profile` but pre-fill the session
  with defaults.** Rejected: the step's gate would always pass and the panel would be decorative.

## Consequences

- **The wire and schema changed again.** `ManagerProfileView` and `commitCareer` carry the five new
  fields; saves remain disposable, so there is no migration (the schema-version gate refuses older
  files).
- **The avatar has no portrait yet.** `avatar_portrait_key` is null until an asset set lands; the
  colour/initials fallback is the whole of the appearance for now.
- **The style is a starting point only.** Every axis stays editable in the Tactics editor, and a
  later change to `TACTICAL_STYLE_DEFAULTS` affects only careers created after it — the axes already
  seeded are not retroactively rewritten.
