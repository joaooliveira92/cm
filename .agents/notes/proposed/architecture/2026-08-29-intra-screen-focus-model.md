# Agent Note: Intra-screen focus model

Status: proposed

## Problem

The renderer has zero focus handling — no `tabIndex`, no `autoFocus`, no focus styling. Browser-default tab order is unusable on a 30-column table. The keyboard-first destination requires a consistent model for how focus moves *within* a screen, but there was no shared vocabulary or design for roving vs flat tab order, regions, selection-vs-focus, focus rings, arrival behavior, or async restoration.

## Proposal

Adopt a **hybrid focus model**: native Tab navigation between meaningful regions and controls, with roving focus only inside dense composite widgets. Focus identifies the recipient of immediate keyboard input; selection identifies the durable argument for application Actions. Focus restoration uses stable semantic identities and deterministic fallbacks, never array index alone.

### Roving vs flat tab order

Keep roving focus for tables, grids, long lists, tab sets, menus, and toolbars. Use native Tab order everywhere else.

Tab contract for composite widgets:
- `Tab` / `Shift+Tab`: move between screen-level components (let the browser navigate between each region's active `tabIndex={0}` element — do not globally intercept Tab)
- `ArrowUp` / `ArrowDown`: move between rows in a list/table; move between items in a vertical menu/toolbar
- `ArrowLeft` / `ArrowRight`: move between cells only if individual cells expose meaningful interaction (e.g., inline editing); otherwise keep focus on the row
- `Home` / `End`: first and last row in a list/table
- `Enter`: open or activate the focused item
- `Space`: toggle or commit selection
- `Escape`: leave an editing or transient interaction mode

Do not turn static table cells into focus stops. If navigation is row-oriented, keep focus on the row or on a single primary control within the row.

### Regions

Every screen has a logical focus structure, but not every screen needs to declare multiple roving regions. A region should exist when a portion of the screen has a recognizable purpose, contains a group of related interactions, needs its own remembered current item, needs arrow-key navigation, can appear or disappear independently, or needs focus restoration after an update.

All screens have a primary focus target. Complex screens may declare focus regions. Only composite regions maintain a roving current item. Landmarks (nav, main, appropriately named sections) reflect document structure even when they are not keyboard stops.

### Selection vs focus

Keep them separate. An Action's implicit argument comes from selection, not transient focus.

Definitions:
- **Focus**: where the next keyboard command will be delivered
- **Current item**: the item represented by the active descendant or roving tabIndex={0} within a composite region
- **Selection**: durable application state identifying the target of commands
- **Activation**: opening or executing the focused item
- **Hover**: pointer-only visual state with no semantic authority

Behavior: `ArrowDown` moves focus only. `Space` commits/toggles selection. `Enter` opens the focused row or invokes its primary action. Consequential Actions (Bid, Release, etc.) operate on selection, not focus.

Distinguish two table modes:
- **Browse-only table**: focused row may serve as implicit context (no persistent selection)
- **Actionable table**: selection is required for commands that outlive navigation or have consequences

### Focus ring

Use one semantic focus treatment shown through `:focus-visible`. No blue-vs-gold modality distinction.

Tailwind baseline:
```
outline-none
focus-visible:ring-2
focus-visible:ring-amber-300
focus-visible:ring-offset-2
focus-visible:ring-offset-slate-950
```

Do not manually track keyboard-vs-pointer input unless testing reveals `:focus-visible` is insufficient.

### Focus on arrival

Priority policy:
1. **Return navigation**: restore the last meaningful focus target for that screen (by stable ID)
2. **Forward navigation to a newly entered screen**: focus the screen's primary interaction
3. **Navigation caused by a specific action**: focus the result most closely related to that action
4. **No interactive primary target**: focus a programmatically focusable screen heading
5. **Pointer navigation**: normally avoid moving focus unless the clicked control naturally receives it

Use a `FocusBookmark` type with screen ID, region ID, optional item ID, optional control ID — semantically identified, not index-based. Screen-level restoration is session-local, not permanently persisted.

### Async focus restoration

Replace `{ region, index }` with a `CollectionFocusBookmark` that captures item ID plus previous/next neighbor IDs. Resolution order: same item → old next neighbor → old previous neighbor → first valid item → region empty-state target → screen's primary interaction → screen heading.

During mutation: keep focus on the initiating control when it remains mounted. Set it `aria-busy="true"`. Do not disable the focused element. Do not move focus to a spinner. If a wholesale refetch unmounts the screen, place focus on a stable screen container and restore the bookmark after commit. Never send focus to `document.body`.

## Alternatives considered

- **Flat tab order everywhere**: simpler to implement but forces hundreds of tab stops through a 30-column table; loses the level-3 mouse-free ambition.
- **Global Tab interception (manual region cycling)**: used in the prototype but fragile around dialogs, browser controls, inputs, portals, disabled actions, and dynamically inserted content. Letting the browser navigate between `tabIndex={0}` per region is more robust.
- **Selection = focused row (implicit target)**: simpler for the player but silently changes the target of consequential Actions (Bid, Release) as focus moves, violating the principle of least surprise.
- **Two-color focus ring (gold vs blue)**: attempted in prototype but unnecessary — the browser has one current focus owner regardless of input modality; `:focus-visible` already distinguishes keyboard focus natively.
- **Index-based async restoration**: fails when data changes between fetch and re-render (row 10 after a sort may be an unrelated player).

## Acceptance criteria

- Every screen has a primary focus target that receives focus on keyboard arrival
- Tables and grids use roving tabindex with arrow-key navigation
- Non-composite controls use native Tab order (no roving)
- Selection is visually distinct from focus (background + marker, not just outline color)
- Consequential Actions operate on selection, not focus
- Focus survives a full-screen refetch and restores to the correct item by semantic ID
- `:focus-visible` is the sole mechanism for showing focus rings (no manual modality tracking)

## Risks

- **Regions add complexity to screens that don't need them**: mitigated by making regions optional — only composite widgets require roving
- **Identity-based restore relies on stable player/entity IDs**: if IDs are ephemeral (per-session), fall back to neighbor resolution; worst case lands on the primary interaction of that screen
- **`aria-busy` on mutating regions**: not all screen readers handle it consistently; a restrained live-region announcement may be needed as a parallel channel