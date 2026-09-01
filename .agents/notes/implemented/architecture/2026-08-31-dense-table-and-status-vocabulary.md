# Agent Note: Dense table visuals and the player-status vocabulary

Status: implemented

## Problem

The two shipped shared-table components — `renderer/table/DataTable.tsx` and
`renderer/table/TablePanel.tsx` — own sorting, filtering, roving focus, selection-vs-focus,
row primary actions, and Squad's column visibility, but their visuals are still the flat default
Tailwind slate (`text-sm` body, `py-1` rows, an unicode sort arrow, `aria-selected` only with no
visible selection fill). They predate the adopted chrome-blue visual frame
([Visual design tokens and chrome-blue retro frame](2026-08-29-visual-design-tokens.md)),
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
([Contextual Help and mechanical provenance](../../proposed/architecture/2026-08-29-contextual-help-mechanical-provenance.md))
forbids the renderer from inventing statuses the engine does not model, and the table's keyboard
first focus model ([Table and grid navigation](../feature/2026-08-29-table-and-grid-navigation.md))
makes the player-name button the row's focus surface — a status runner must not fight it.

## Decision

The shared table layer carries the visual contract below, and the squad table carries a reserved
player-status column that renders only engine-modeled state.

### Density (shared table layer)

- **Row density**: `text-xs` (12px) body, `py-0.5` rows, 8px column gaps, in
  `components/ui/table.tsx` — so every table built on the shared components inherits it and no
  screen themes its own.
- **Column headers**: a flat bottom-divider header on the panel-border token, with the sort
  indicator in `--text-secondary`. Chrome-blue gradient headers belong to *panels*, never to table
  columns: a 30-column header row in chrome is noise, and the flat header is already wired to
  `aria-sort`.
- **Row states, four-way separable** (all distinct from the focus ring, which stays on the name
  *button*): neutral row / **hover** = a neutral lift / **selection** = the chrome-blue fill /
  **focus** = the name-button ring. No zebra striping — alternating shading across 30 columns is
  scanline noise. Selection is marked `!important` so it wins over hover on a selected row the
  pointer is over; the two variants otherwise tie on specificity.
  Both fills are **opaque** rather than the low-opacity chrome-blue the proposal described. The
  pinned columns have to paint their own opaque background to hide the columns scrolling beneath
  them, so a translucent fill would compose differently there than on the rest of the row.
  `--color-row-selected` is that low-opacity chrome-blue flattened over `--color-bg-base`: it reads
  as the intended tint and composes deterministically under the sticky overlap.
- **Horizontal overflow edge**: a scroll-position-driven fade on each side that has content hidden
  beyond it, driven by the pure `scrollEdges` rule in `DataTable.tsx`; no persistent "scroll for
  more" affordance.
- **Pinned columns declare a fixed `size`.** The sticky `left` offset of each pinned column is the
  summed width of the pinned columns before it, so the widths cannot be left to content.

### Player-status vocabulary (squad table)

- **A reserved status column**, the first data column right of the pinned Name column and pinned
  with it, so a player's status stays visible while the attribute columns scroll. It renders **only
  what the engine models**; everything else is empty. The *column arrangement* is the committed
  contract — reserved so future status systems fill seats without a re-layout.
- **Always-visible, non-dismissible**: Name and Status are the two protected columns
  (`SQUAD_PROTECTED_COLUMN_IDS`). They are absent from the show/hide list rather than present and
  disabled, `toggleColumn` refuses to drop them whatever calls it, every preset carries them, and
  the persisted-preference reconcile restores and pins them on every load — including from a blob
  written before Status existed.
- **What renders today**: Condition below the match engine's own `NON_CONTACT_CONDITION_THRESHOLD`
  (75%) shows `Tir`. That threshold is imported from the engine rather than restated, so the
  display rule cannot drift from the mechanic it reports: below it, the engine starts rolling
  fatigue injuries. Nothing else in the catalogue is derivable, so nothing else renders.
- **Format**: the CM 3-letter abbreviation as the visual channel, `aria-hidden`, beside a
  screen-reader-only full term. The row's full terms also reach the table's polite announcer when
  the row takes focus. The code never reaches assistive technology in any form.
- **Colour**: the abbreviation text is toned by status category against the existing semantic text
  tokens — `danger` for statuses that make a player unselectable, `warning` for diminished or
  at-risk, `success` for market and contract information that does not affect availability. No
  filled badge, and colour only augments the abbreviation rather than carrying meaning alone.
- **Discoverability**: the Status header *is* the disclosure — a button carrying `aria-expanded`
  and `aria-controls` for the legend, keyboard-operable, never hover-only. The legend itself renders
  directly above the table rather than inside the header cell: the header lives in a horizontally
  scrolling, overflow-clipped container that a 72px pinned cell cannot escape. It lists every
  reserved abbreviation with its full term, its likelihood, and why it is or is not modeled.
- **Reservation catalogue**: the **full CM 03/04 set** lives in
  `apps/desktop/src/renderer/table/squad/playerStatus.tsx` as `RESERVED_STATUSES`, in CM's own
  order, each entry carrying an honest likelihood — `modeled`, `plausible`, or `unlikely`. The
  selection-rule statuses (Fgn, Ine, Wpm, Cup, Int) and Sct are `unlikely`; injury, suspension,
  transfer-listed/wanted and the morale-driven ones are `plausible`. Provenance still holds: adding
  an entry reserves a slot and renders nothing until `statusesOf` can derive it from engine state.

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

## Consequences

- Every table on the shared layer — squad, transfers, free agents — inherits the compact tier, the
  flat divider header and the four-way row states without per-screen work. A screen that wants a
  different table look now has to argue with `components/ui/table.tsx`, which is the point.
- The squad table permanently spends ~72px of horizontal room on Status. That is part of why the
  12px/8px-gap density was adopted over the previous 14px default; it is not recoverable by a
  setting, by design.
- Adding a status is a two-line change once the engine models the state: widen `StatusSource` and
  extend `statusesOf`. Widening `StatusSource` is the signal that a reserved slot has become
  renderable.
- `RESERVED_STATUSES` is a superset of what will ever ship. A reader could still take the list as a
  roadmap; the per-entry likelihood and the legend's own wording ("a reservation is not a promise")
  are the mitigation, and the test asserts exactly one entry is `modeled` so the boundary cannot
  quietly move.
- **12px is genuinely small.** The compact tier is CM-faithful and needs a human visual pass at
  each adoption step rather than a screenshot test; the fallback font chain from the token decision
  applies here too.
- The pure seams — `statusesOf`, `scrollEdges`, `toggleColumn`, `reconcileColumnPreferences` — carry
  the behaviour that can regress silently. The rendered look has no auto-test seam in this repo and
  the spec deliberately does not invent one.
- The renderer now imports one constant from `@cm-clone/game-engine`
  (`NON_CONTACT_CONDITION_THRESHOLD`). The engine is a pure, node-free package that the desktop app
  already depends on, and the alternative — restating 75 in the renderer — is the drift this note
  exists to prevent.
