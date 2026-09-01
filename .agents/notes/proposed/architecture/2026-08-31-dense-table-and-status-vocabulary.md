# Agent Note: Dense table visuals and the player-status vocabulary

Status: proposed

## Problem

The two shipped shared-table components — `renderer/table/DataTable.tsx` and
`renderer/table/TablePanel.tsx` — own sorting, filtering, roving focus, selection-vs-focus,
row primary actions, and Squad's column visibility, but their visuals are still the flat default
Tailwind slate (`text-sm` body, `py-1` rows, an unicode sort arrow, `aria-selected` only with no
visible selection fill). They predate the adopted chrome-blue visual frame
([Visual design tokens and chrome-blue retro frame](../architecture/2026-08-29-visual-design-tokens.md)),
whose density class (`text-xs` 12px body, `py-0.5` rows) they do not yet meet, and they render no
player-status vocabulary at all.

CM 03/04's most distinctive element — a set of ~20 compact status abbreviations (Lmp, Inj, Sus,
Wnt, Bid, Yel, Int, Fgn, Ine, Wpm, Tir, Cup, Loa, Lst, Unh, Unf, Sct, Yth, Req) beside player
names (`docs/ui-elements.md`) — has no counterpart here. Only `condition` on `SquadPlayerView`
(`packages/contracts/src/schemas.ts`) is a modeled per-player status state; injury is a per-match
match event (`packages/game-engine/src/match/injury.ts`) with no season-long "currently injured,
days out" state, and there is no suspension, transfer-listed, or wanted state surfaced on the squad
read model. The clone renders nothing.

The clone's own rules constrain any answer: Mechanical Provenance
([Contextual Help and mechanical provenance](../architecture/2026-08-29-contextual-help-mechanical-provenance.md))
forbids the renderer from inventing statuses the engine does not model, and the table's keyboard
first focus model ([Table and grid navigation](../../implemented/feature/2026-08-29-table-and-grid-navigation.md))
makes the player-name button the row's focus surface — a status runner must not fight it.

## Proposal

Establishes the visual contract for the shared table layer and commits the player-status surface
of the squad table, reserving the full CM 03/04 abbreviation vocabulary as future slots without
rendering unmodeled data today.

### Density (shared table layer)

- **Row density**: `text-xs` (12px) body, `py-0.5` rows, 8px column gap — the ticket-02 compact
  tier, validated against a live 30-column Squad table once the token layer lands (ticket 05)
  rather than re-decided in the abstract.
- **Column headers**: flat bottom-divider header (panel-border token) with light-grey
  `--text-secondary` unicode sort indicator (▲/▼/↕). Chrome-blue gradient headers are reserved for
  *panels* (ticket 04), never for table columns — a 30-column header row in chrome would be visual
  noise and the flat header is already shipped and wired to `aria-sort`.
- **Row states, four-way separable** (all distinct from the amber/yellow focus ring, which stays on
  the name *button*, not the row): neutral row / **hover** = subtle brightness lift / **selection**
  = a low-opacity chrome-blue row fill / **focus** = the name-button ring. No zebra striping on a
  dense table — alternating shading across 30 columns is scanline noise. The selection fill must
  read through the pinned name column's opaque background.
- **Horizontal overflow edge**: a soft scroll-position-driven right-edge fade (and left-edge fade
  once scrolled) on the scroll container; no persistent "scroll for more" affordance.

### Player-status vocabulary (squad table)

- **A reserved status column**, the first data column immediately right of the pinned Name column,
  pinned with it so a player's status stays visible while the attribute columns scroll. It renders
  **only what the engine models** (today only `condition`); everything else is empty. The *column
  arrangement* is the committed contract — reserved so future status systems fill seats without a
  re-layout.
- **Always-visible, non-dismissible**: the status column, like Name, is a protected column excluded
  from the visibility off-set and the `SQUAD_PRESETS`/per-column toggles in
  `renderer/table/features/visibility.ts` — the abbreviation vocabulary can never be toggled away.
- **Format**: CM's 3-letter text abbreviation as the primary channel (text-led, no icon library).
  Each abbreviation additionally carries a separate full-term accessible string fed to the table's
  polite announcer when the row gains focus, so a screen-reader or keyboard user hears the word,
  never the code. Abbreviations are never leaked untranslated to the announcer or any alternative
  text.
- **Colour**: the abbreviation text is coloured by status category against the existing semantic
  text tokens (`--text-danger`/`--text-warning`/`--text-success`); no filled badge. The
  abbreviation is the primary channel and colour only augments it — never the sole signal, matching
  ui-elements' "icons and colour augment text, not replace it."
- **Discoverability**: the Status column header carries a Term Disclosure-style control that
  expands the full abbreviation legend in place; no hover-only interaction (frame forbids it). The
  legend lists every reserved abbreviation with its full term.
- **Reservation catalogue**: the **full CM 03/04 set** is earmarked as reserved-but-unbuilt slots in
  the spec — Lmp, Inj, Sus, Wnt, Bid, Yel, Int, Fgn, Ine, Wpm, Tir, Cup, Loa, Lst, Unh, Unf, Sct,
  Yth, Req. Provenance still holds: none of these render until the engine models the underlying
  state. The spec notes, per status, an honest likelihood of the engine ever modeling it — the
  selection-rule ones (Fgn foreign, Ine ineligible, Wpm no work permit, Cup cup-tied, Int
  international) and Sct (scouting) are low-likelihood reservations, while Injury, Suspension,
  Condition/Fitness, and transfer-listed/wanted map onto modeled or plausible state.

## Alternatives considered

1. **Shaded chrome-blue table headers.** CM's beveled title-bar look applied per column. Rejected:
   a 30-column header row of chrome gradients is visual noise, and the flat bottom-divider header
   is already shipped and wired to `aria-sort`; the chrome gradient belongs to panels, not columns.
2. **Zebra striping.** Alternating row shading improves line-tracking but adds scanline interference
   across 30 dense columns and competes with the selection fill. Rejected in favour of the
   four-way neutral/hover/selection/focus scheme.
3. **Curated reservation (subset) versus the full CM set.** Earmark only the statuses the engine is
   plausibly going to model (injury, fitness, suspension, transfer) and omit selection-rule and
   scouted-for ones. Chosen against: the user deliberately selected the **full CM set** so the spec
   carries the whole vocabulary as the long-term contract; the provenance separation (nothing
   unmodeled renders) makes a superset reservation harmless. The full set is therefore adopted, with
   the likelihood note preventing it from implying each will actually ship.
4. **Status as a filled badge/tag, or a separate status colour family.** A filled badge costs
   density and runtime chrome; a dedicated colour family would collide with the shared
   danger/warning/success semantics. Both rejected in favour of coloured abbreviation text reusing
   the semantic tokens.

## Acceptance criteria

1. `DataTable` rows render at `text-xs`/`py-0.5` with the panel-border flat divider header and
   `--text-secondary` sort indicator across all tables using the shared layer.
2. Hover, selection, and focus are visually distinct (hover lift / blue fill / name-button amber
   ring); selection reads through the pinned name column.
3. The scroll container shows the scroll-position-driven edge fade.
4. Squad renders a reserved Status column immediately right of the pinned Name, pinned with it,
   non-dismissible by the visibility toggles and presets.
5. The Status column renders only engine-modeled state (today `condition`); unmodeled statuses
   produce empty cells — no invented data.
6. Each rendered abbreviation also feeds its full term to the polite announcer on row focus.
7. The Status header offers an in-place legend (Term Disclosure pattern, no hover-only) listing the
   full reserved CM set with likelihood notes.
8. The visual-design-language spec documents the density contract and the reserved abbreviation
   catalogue per this note.

## Risks

- **Density legibility at 12px.** The compact tier is CM-faithful but genuinely small; mitigated by
  validating against the live 30-column table when the token layer lands, and by the fallback font
  chain (Trebuchet MS → Segoe UI → Arial) already adopted in the frame decision. The font
  availability risk from the token note applies equally here.
- **Reserving the full CM set over-promises.** The provenance separation ensures nothing unmodeled
  renders, but a reader of the spec could infer all ~20 statuses will ship; the per-status
  likelihood note is the mitigation and must survive into the spec.
- **Selection fill behind the pinned name column.** The pinned name cell currently hardcodes
  `background: rgb(2 6 23)`; overlaying the chrome-blue selection fill there needs the two states to
  compose, which the implementation must handle deliberately rather than leaving the name cell
  opaque against a selected row.
- **Status column width vs. 30 attribute columns.** Adding a pinned status column consumes
  horizontal space; acceptable because it is always-on by design, but it tightens the already-dense
  scroll region and is part of why 12px/8px-gap density was adopted over the previous 14px default.
