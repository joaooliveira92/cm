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

Six facts constrain every ticket. None is a decision to re-litigate.

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
- **A changed league scope after generation is silently ignored.** `runGeneration` fires on every
  `leagueSelection` change but is a no-op from `Ready`, so re-choosing scope keeps the first world.
  Invisible today (one League generates whatever scope was chosen) and a silent data bug the moment
  generation honours the snapshot. Found by ticket 02, spun out as
  [09 — Changing league scope after generation](issues/09-league-rescope-after-generation.md).
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

- [02 — Selected club in the creation session](issues/02-selected-club-in-the-creation-session.md): the
  selection is a record bound to the world it was picked from — `{ clubId, clubName, provisionalId }`
  or `null` — written only through a new `selectClub` on `CreateSessionApi` and read only through a
  `selectedClubOf` helper that returns `null` on a binding mismatch, so a stale id cannot reach
  `commitCareer`. Continue is gated on a pick with a stated reason; the pick survives back-navigation;
  `commitCareer` rejects an unknown id with the existing `ClubNotFoundError`; `ReviewPane` gains a club
  row. Recorded as [Agent Note: The club selection is bound to the world it was picked from](../../.agents/notes/proposed/architecture/2026-09-01-club-selection-bound-to-its-world.md).

- [03 — Club detail contract](issues/03-club-detail-contract.md): the panel is a compact squad
  readout — board expectation as prose from the shared constant, labeled Transfer/Wage Budget rows in
  Credits, squad size + average age (subordinate), and a top-five-by-`overallRating` players row —
  shipped in one widened `ClubSelectionView` payload (no per-club RPC), with a shared `formatCredits`
   replacing the inline `$`. Recorded as [Agent Note: The club detail panel is a compact squad readout over one payload](../../.agents/notes/proposed/architecture/2026-09-01-club-detail-contract.md).

- [04 — League selector options source](issues/04-league-selector-options-source.md): the selector is
  built degenerate — the single option names the one generated League from a new shared `LEAGUE_NAME`
  constant (not the session snapshot, which records un-honoured intent); selecting it is inert chrome
  while the world holds one League; `ClubSelectionRow` gains no league field now (league identity's
  scheme belongs to the multi-league effort); and it renders as a disabled native `<select>` with a
  stated reason, never the enabled single-option trap. Recorded as
  [Agent Note: The league selector sources a named, inert, single-option control](../../.agents/notes/proposed/architecture/2026-09-01-league-selector-options-source.md).

- [05 — `Pick a team for me` semantics](issues/05-pick-a-team-for-me-semantics.md): the pick is one
  press of `Math.random()` over the loaded clubs, excluding the currently selected one — unseeded
  (the world seed never reaches the renderer, and the suggestion isn't persisted), every club, not a
  league; focus stays on the button with the result announced through an `aria-live` region; a
  subdued button below the list, disabled while the list is empty. Recorded as
  [Agent Note: `Pick a team for me` is an unseeded, exclusion-rolled assist](../../.agents/notes/proposed/architecture/2026-09-01-pick-a-team-for-me-semantics.md).
  The row-reading and panel-live-region half lands in ticket 06.

- [06 — Keyboard and accessibility tier](issues/06-keyboard-and-accessibility-tier.md): the screen is
  level 2 — a bespoke `role="listbox"` on the renderer's roving primitives (not `DataTable`, not
  `aria-activedescendant`), Enter selects, ↑/↓ Home/End rove, focus order list → `Pick a team for
  me` → Cancel → `Next: Review`; one polite panel announcer on show-change; no key binding for the
  assist and no Clear Selection (both reconciliation deviations). Recorded as
  [Agent Note: Club Selection is a level-2 listbox, not a DataTable](../../.agents/notes/proposed/architecture/2026-09-01-club-selection-keyboard-tier-and-listbox.md).
  The screen-keyboard-tiers table row updates from 1 to 2.

- [07 — Screen 11 reconciliation update](issues/07-screen-11-reconciliation-update.md): the register
  edit ships **with the implementing code**, not before it; this ticket settles the exact
  restatement the spec carries forward — the Screen 11 audit table is fully replaced (rows+kind),
  with mode selector / availability / eligibility, search / filter, and facilities / staff /
  performance ruled deliberate `out-of-scope` deviations, keyboard and state-model rows restated at
  level 2 and world-bound, virtualization and autosave `deferred`/`unscheduled`, the stale
  `temp-club-id` paragraph replaced, and Screen 12's unreachable-commit paragraph updated to match.
  Scoping + transcription of the six decisions above: no new note.

- [08 — Assemble the spec](issues/08-assemble-spec.md): the spec is assembled at `spec.md` in the
  `/cm-to-spec` shape from tickets 01–07 and their six notes — Implementation Decisions carry each
  ticket's gist-link verbatim, the Screen 11 restatement rides as a normative instruction, and the
  out-of-scope set is restated — `Status: ready-for-agent`, ready for `/cm-to-tickets` →
  `/cm-implement`. Assembling it confirmed 09 sits past the destination (generation lifecycle, not
  Club Selection work) and it is ruled out of scope below. No new note: assembly, not a decision.
  **The map is done: nothing is left to decide before the hand-off.**

## Not yet specified

_(None. The two charting-era patches — club-list virtualization and alignment with the
visual-design-language effort — resolved past this destination when the spec was assembled
(ticket 08) and are recorded under Out of scope. The frontier is clear; the map is complete.)_

## Out of scope

- **Multi-league world generation.** Materializing the League Selection Snapshot into more than
  the fixed 20-club League is world generation's subject, per the recorded generation boundary.
  This effort builds the selector that will consume it. Includes the **changing-league-scope-after-
  generation lifecycle**, [closed as 09](issues/09-league-rescope-after-generation.md): whether a
  rescope regenerates or is frozen, what happens to the world in flight, and what the user sees
  are generation-lifecycle decisions, invisible until generation honours the snapshot.
- **Search and filter over the club list**, per the imported Screen 11 spec.
- **The eligibility model** — availability states (eligible / unavailable / occupied /
  restricted / unsuitable), manager reputation, qualifications, nationality, and language
  gating.
- **The Clubs / National Teams / Unemployed mode selector**, and starting a career unemployed.
- **A manager-to-club fit model.** `Pick a team for me` is uniform random; weighting a
  recommendation by Pillars or Archetype needs a fit model that does not exist.
- **A facilities readout**, absent from the schema.
- **Club list virtualization.** Twenty meter rows render eagerly; the threshold — and whether the
  shared `renderer/table/` layer is the host — belongs to whenever a second league generates.
- **Alignment with the visual-design-language effort.** Whether this screen adopts that map's
  create-career chrome band and surface-field tokens directly, or needs its own workspace grammar,
  is that effort's decision, not this map's.
