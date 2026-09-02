# Map: club-selection

Label: wayfinder:map

## Destination

A **spec** at `.scratch/club-selection/spec.md` describing the Club Selection screen as a
two-column workspace — league selector, club list, and a `Pick a team for me` action on the
left; a club detail panel on the right — **and** the selection state that makes it mean
something: a chosen club that survives into `commitCareer`, replacing the hardcoded
`temp-club-id`.

Plan-only. The map is done when nothing is left to decide and the spec can be handed to
`/cm-to-spec` → `/cm-to-tickets` → `/cm-implement`.

## Notes

- Domain: the `@cm-clone/desktop` Electron renderer (React 19, Tailwind 4, Effect stack), plus
  the `getClubSelection` main-process query and the `ClubSelectionRow` contract behind it.
- **Skills every session should consult**: `grilling` and `domain-modeling` by default;
  `effect-code` for any session touching source; `vercel-composition-patterns` for the
  component split; `doc-standards` for docs.

### Ground truth as of charting (2026-09-01)

Five facts constrain every ticket. None is a decision to re-litigate.

- **Nothing selects a club.** `router/createFlow.tsx:331` passes
  `selectedClubId: ClubId.make("temp-club-id")` into `commitCareer`. `CreationSession` has no
  club field, and `ClubSelectionScreen.tsx` renders a non-interactive list of cards.
- **One League generates, whatever scope was chosen.** `CONTEXT.md`'s "Generation boundary, as
  of 2026-08-31" records that `beginCareer` materializes only the fixed 20-club League; the
  League Selection Snapshot is carried but not honoured by generation.
- **The world database has no league dimension.** There is no `competitions` or `leagues`
  table, and `clubs` has no league foreign key — `clubs` is
  `(id, name, stature_tier, is_user_club, generation_seed)`. `getClubSelection` reads
  `FROM clubs` unfiltered. A league selector therefore cannot source its options from the
  world; the only available source is the `LeagueSelectionSnapshot` on `CreationSession`.
- **No facilities data exists** in the schema, so no facilities readout is possible in the
  detail panel.
- **The creation shell cannot host a workspace as it stands** (found by ticket 01's prototype).
  `CreateFlowLayout`'s `<main>` is a `max-w-5xl` centred `overflow-y-auto` column and `RouteView`'s
  wrapper passes no height down. A full-height two-column step needs the shell to become a
  flex-height, full-width band — shared layout, not club-screen code.

### Standing decisions from charting

- The list column is **left**, the detail panel **right**.
- The requested 5% / 90% heights are **intent, not literal**: the selector and the button are
  fixed-height chrome and the list takes all remaining space, expressed as a flex column. A
  literal 5% selector falls below the minimum click target on a short window.
- The league selector is built **degenerate**: present and correct in shape, with one option
  today, so it becomes right rather than new when generation catches up.
- **The Screen 11 reconciliation rows get updated in this effort.** `RECONCILIATION.md:298`
  marks this screen's selection affordance, mode selector, and eligibility model
  `contradicted` against the current static list; changing the code without reconciling the
  register leaves the register lying.

## Decisions so far

<!-- populated as tickets resolve -->

- [01 — Two-column workspace shape](issues/01-two-column-workspace-shape.md): the rail row carries
  name, stature tier and a squad-quality meter; the panel shows a league summary until a club is
  picked, with no auto-selection and no empty state; the rail loads and fails independently of the
  panel; selection is redundantly coded (fill, accent bar, badge) against the single focus ring.
  Recorded as [Agent Note: The Club Selection two-column workspace](../../.agents/notes/proposed/architecture/2026-09-01-club-selection-workspace-shape.md).
  Variant set captured on the throwaway branch `prototype/club-selection-workspace`.

## Not yet specified

- **Whether the club list needs virtualization.** Twenty rows do not, but the selector exists
  precisely because more leagues are coming. The threshold, and whether the shared
  `renderer/table/` layer is the right host instead of a bespoke list, waits on the list's
  shape.
- **Alignment with the visual-design-language effort.** That map's create-career surface ticket
  covers chrome bands and surface fields for the creation flow. Whether this screen adopts
  those tokens directly or needs its own workspace grammar is not yet answerable.

## Out of scope

- **Multi-league world generation.** Materializing the League Selection Snapshot into more than
  the fixed 20-club League is world generation's subject, per the recorded generation boundary.
  This effort builds the selector that will consume it.
- **Search and filter over the club list**, per the imported Screen 11 spec.
- **The eligibility model** — availability states (eligible / unavailable / occupied /
  restricted / unsuitable), manager reputation, qualifications, nationality, and language
  gating.
- **The Clubs / National Teams / Unemployed mode selector**, and starting a career unemployed.
- **A manager-to-club fit model.** `Pick a team for me` is uniform random; weighting a
  recommendation by Pillars or Archetype needs a fit model that does not exist.
- **A facilities readout**, absent from the schema.
