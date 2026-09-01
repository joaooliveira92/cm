# 03 — Dense table visuals and status abbreviations

Type: grilling
Status: resolved

> Rewritten 2026-08-31. The original version of this ticket asked how to build
> view-switching, clickable rows, and a column set. All three shipped in the
> meantime. What survives is the *visual* half plus the status vocabulary.

## Question

How does the shared table layer render CM 03/04's density and player-status
vocabulary, given that the table's structure and behaviour are already built?

### What is already settled (do not re-decide)

- `renderer/table/DataTable.tsx` owns the semantic `<table>`, roving row focus on
  the player-name button, native sortable headers with `aria-sort`, selection
  separate from focus, Enter as row primary action, and Shift+Arrow horizontal
  scroll.
- `renderer/table/TablePanel.tsx` owns filter controls and the empty / no-results
  / busy / error state matrix.
- `renderer/table/squad/squadColumns.ts` defines Name, Age, Positions, OVR plus one
  column per attribute. `SQUAD_PRESETS` and per-column toggles already give Squad
  the equivalent of CM's General/Contract/Fitness view switching, and the
  preferences survive restart.

### Decide: density

1. Row height and font size for the token system's compact tier. The visual frame
   decision proposed `py-0.5` rows and 12px body text; confirm or revise against a
   real 30-column Squad table, not in the abstract.
2. Column header treatment — CM used shaded headers, the clone uses a flat bottom
   border. What do headers look like under the chrome-blue panel system, and how
   does the sort indicator read at 12px?
3. Zebra striping, row hover, and row selection: three visual states that must stay
   distinguishable from the focus ring without competing with it.
4. How the horizontal-scroll edge is signalled when Squad overflows.

### Decide: status vocabulary

CM 03/04 used ~25 compact abbreviations (Lmp, Inj, Sus, Wnt, Bid, Yel, Int, Fgn,
Ine, Wpm, Tir, Cup, Loa, Lst, Unh, Unf, Sct, Yth, Req). The clone renders none.

1. Which of these have a modeled equivalent today? Injury is modeled
   (`packages/game-engine/src/match/injury.ts`); most are not. Ground this in the
   engine, not in the CM list.
2. Which unmodeled statuses are worth reserving a display slot for, so the column
   does not need re-designing when the system ships?
3. Display format: abbreviation, full text, icon, or hybrid — and how that survives
   a screen reader, given the table already carries a polite announcer.
4. Placement: CM put status beside the player name. Does that fight the name button
   that owns row focus?
5. Colour treatment per status category, and whether it can be distinguished from
   the existing red/amber/green semantics without relying on colour alone.

### Output

A section of the spec covering table density tokens and the status vocabulary,
plus whichever statuses are reserved but unbuilt.

## Answer

**Shared-table density contract (12px/`py-0.5`, flat divider headers, four-way separable row
states, scroll-driven edge fade) plus a reserved, always-on, pinned Status column rendering only
engine-modeled state, with the full CM 03/04 abbreviation set earmarked as reserved slots.** See
[Agent Note](../../../.agents/notes/proposed/architecture/2026-08-31-dense-table-and-status-vocabulary.md).
