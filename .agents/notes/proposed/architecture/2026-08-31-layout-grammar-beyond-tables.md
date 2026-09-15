# Agent Note: Non-table layout grammar — fields, dialogs, creation-flow frame, empty/error states

Status: proposed

## Problem

The adopted visual frame ([Visual design tokens and chrome-blue retro frame](../../implemented/architecture/2026-08-29-visual-design-tokens.md)),
the dense table contract ([Dense table visuals and status vocabulary](../../implemented/architecture/2026-08-31-dense-table-and-status-vocabulary.md)),
and the career chrome ([Career chrome frame and date/Continue bar](../../implemented/architecture/2026-08-31-career-chrome-and-date-continue-bar.md))
pattern the shell and the data tables, but the surfaces around them stay ad hoc. Every form field,
every overlay, and every empty/error state is a hand-written `slate-*` recipe, and the recipes
drift apart from each other as well as from the frame: text inputs are `rounded bg-slate-800
px-2/3 py-1/2` with no shared surface token, seven dialogs copy near-identical scrim + panel class
strings that have already diverged (one lacks scrim-click-to-close), the creation flow renders its
own raw `min-h-screen p-8` + `<h1>` + a floating `StepBadge`, and empty/error render ad hoc each
time. The ticket's premise that quit-confirm and "match-readiness" are overlays is wrong:
quit-confirm has no component, and match-readiness is inline content, not a modal.

The token-adoption decision settled panel/button macros (constants not components) and left the
selection surfaces, overlay chrome, pre-career flow frame, and empty/error grammar to the spec.
Nothing decided these; every one is a decision the spec needs to state before implementation starts.

## Proposal

Establishes the non-table layout grammar — fields, dialogs/overlays, the creation-flow frame, and
empty/error states — as four patterns composed from the adopted token set under the established
constants-not-components rule ([Token adoption and migration](2026-08-31-token-adoption-and-migration.md)).
The patterns are visual only: focus behavior, Tab trapping, keyboard dispatch, and overlay focus
restore are owned by the shipped focus model, the spine overlay layers, and `useDialogKeyboard`,
and this decision does not touch them.

### Form fields

- **Constants not components.** `FIELD_INPUT` and `FIELD_SELECT` class-string constants join
  `PANEL`/`BTN_*`/`FOCUS_RING`, per the token-adoption rule: fields are styled surfaces with no
  behavior, so a constant is the shared vocabulary, not a `<Field>` component.
- **New token `--color-field-bg`: an opaque field surface**, darker than the semi-transparent
  panel surface. A field must read the characters you type against an un-washed background; the
  translucent `--color-panel-bg` is wrong as a text-entry surface. Thin
  `--color-panel-border` rim, `--color-field-bg` fill, `--color-text-primary` value.
- **Focus** on `:focus-visible` only via the retuned `FOCUS_RING` (which becomes the
  `--color-focus-ring` yellow per the token decision), the same ring as everything else — the
  intra-screen focus model forbids a second focus color.
- **Labels** at the 12px label/metadata typography tier (`text-xs`, `--color-text-secondary`),
  not today's ad-hoc `text-sm`; field text at 12px matching the density tier.
- **Checkboxes** accent-align to `--color-accent-green` (the re-named `--accent-green` "primary
  action background" token — the de-facto positive accent), replacing today's
  `accent-amber-400`; selects consume `FIELD_SELECT`, and sliders consume `FOCUS_RING`.
- **Invalid fields**: danger-tinted border + `--color-text-danger` value; the inline error
  text is the danger line under the field (see empty/error grammar), never a separate recipe.
- No textareas exist in the renderer; if one arrives it uses the `FIELD_INPUT` surface.

### Dialogs and overlays

Today seven overlays copy near-identical scrim + panel chrome by hand — `fixed inset-0 z-40`
scrim + `rounded-lg border-slate-700 bg-slate-900 shadow-2xl` panel (save-list Preferences and
Credits via `LightweightDialog`, command palette, help, teaching splash, Retire confirmation,
counter-offer `InlineModal`, and the Keep/Discard draft dialog) — with small divergent deltas
(palette top-anchored and wide, help wider, teaching splash darker scrim + amber rim) and one real
divergence (Keep/Discard lacks scrim-click-to-close). Unify into:

- **`MODAL` constants + a documented anatomy, not a `<Dialog>` component.** Scrim
  (`bg-black/60`, teaching splash keeps `bg-black/70`), centered panel, a **chrome-blue
  gradient title band** (the same grammar as the career-chrome title bar, so an overlay
  announces the same voice as the shell), `--color-panel-bg-strong` body surface,
  `--color-panel-border` rim, `shadow-2xl`.
- **Two sanctioned sizes**: compact centered for confirmations and the counter-offer form;
  the wide/top-anchored variant for help and the command palette, which keeps its combobox
  anatomy and top-anchored position inside the shared shell.
- **Header/body/footer anatomy**: gradient title band (title + optional close), body on the
  strong panel surface, footer as the action row in `BTN_PRIMARY`/`BTN_SECONDARY`.
- **Scrim-click-to-close is uniform** across overlay-opening dialogs — the Keep/Discard gap is a
  bug the unification fixes.
- **Behavior is untouched**: Escape, Tab trap, focus capture, and focus restore stay with the
  shipped `useDialogKeyboard`, the spine overlay layers, and the `focus.ts` overlay contract.
  This decision is the look; the behavior was already decided and this map does not re-decide it.
- Correction to the ticket's premise: **Quit-confirm and "match-readiness" are not overlays**.
  Quit-confirm has no renderer component — it is an open feature elsewhere
  ([Quit confirmation design](../feature/2026-08-30-quit-confirmation-design.md)) whose shell
  will land on this anatomy when the build ships. The pre-match readiness signal is inline, not
  modal — the opponent picker's disabled Start button and the Continue-blocked reason line. The
  spec must not invent a match-readiness modal. The About dialog and the save-list dialogs from
  the boot-screen note join the same shell.

### Creation-flow chrome

- **A lightweight pre-career chrome band**, mirroring the career chrome's top row: gradient
  chrome band carrying product identity ("New Career"), the step indicator **folded into the
  band** as "Step 2 of 4 · Club", and Cancel/Back in the band. Screens become panels beneath it.
- **Removes** the floating `StepBadge` pills and the screen-owned raw `min-h-screen p-8` +
  `<h1>` headline in `CreateFlowLayout`, replacing them with the band.
- Mirrors ticket-04's division of labour: the chrome owns identity, step, and escape; the
  screens own sections. The floating badge is exactly the screen-owned scaffolding the career
  chrome decision moved away from.
- **Save List is not part of this flow's chrome.** It is the boot screen (`/`) with its own
  title and app-chrome bar (boot-screen-app-chrome-bar decision); it stays a standalone screen
  restyled onto the token system, and its "Start New Career" button is the entry into the flow.

### Empty and error states

Grammar, not a constant library — empty/error surfaces vary more than fields do, and the
patterns compose from existing tokens.

- **Empty**: a text-led, muted centered line at `--color-text-secondary` (`py-6`), no icons
  (the iconography decision already stands). When filtering caused the emptiness, a single
  secondary `Clear all filters` action. When a table drops below a configured row floor it
  renders the same treatment (the shared table layer's existing `EmptyDataset`/`NoFilterResults`
  view states carry the copy). Squad's dual-action empty state ("Explore Free Agents" / "Go to
  Transfer Market") is the one sanctioned action-bearing exception — real affordances earn their
  buttons, and they stay `BTN_SECONDARY`.
- **Structural error** (blocking load, bad address): a danger alert panel — `--color-text-danger`
  border, faint danger fill, danger text — with Retry as a standard `BTN_SECONDARY` button.
  `RouteParamErrorScreen` graduates from a bare `h1`+reason to this grammar **without** a Retry
  button (there is nothing to retry on a bad address). The save-list light-red pill retry conforms
  to the standard secondary button tier.
- **Inline error** (bad field, generation failure, refresh-failure line): a `--color-text-danger`
  line, no box, no panel. The distinction is degree: structural = a surface failed to load;
  inline = a field or action within a loaded surface failed.

## Alternatives considered

1. **A real `<Dialog>` component that also traps focus, handles Escape, and restores focus.**
   Duplicates the shipped `useDialogKeyboard`, spine overlay layers, and `focus.ts` overlay
   contract, and cuts against token-adoption's constants-not-components rule. Rejected: the layout
   is the open problem; the behavior is decided elsewhere and out of this map's scope.
2. **Flat dialog header instead of the gradient title band.** Cheaper, but a flat-slate header
   inside a chrome-blue app would read as the old renderer, and the band lets an overlay announce
   the same voice as the career chrome. Adopted: gradient band.
3. **Keep the floating `StepBadge`, restyling only.** The floating badge is the screen-owned
   scaffolding ticket-04 moved away from; a pre-career flow with no chrome reads as a different
   product. Adopted: in-band step indicator.
4. **A bordered empty panel or instruction line for empty tables.** More present, but heavier
   and the icon-free direction already says "text-led"; the action-bearing empties already exist
   where real affordances justify them. Adopted the muted centered line with action exceptions.
5. **Accent-amber-400 preserved for checkboxes.** Keeps a second accent hue fighting the
   primary-action language. Rejected: checkboxes align to `--color-accent-green`.

## Acceptance criteria

1. `FIELD_INPUT`/`FIELD_SELECT` constants and the `--color-field-bg` token exist alongside
   `PANEL`/`BTN_*`/`FOCUS_RING`; every creation-flow and shared input/select consumes them.
2. Field labels render at the 12px label tier; checkbox accents are `--color-accent-green`;
   all field-like controls (input, select, checkbox, slider) share one `FOCUS_RING` on
   `:focus-visible`.
3. The seven existing overlays plus the About dialog render through the `MODAL` constants and the
   documented anatomy (gradient band, strong-panel body, two sizes); scrim-click-to-close is
   uniform; the command palette keeps its combobox anatomy and top-anchored position.
4. No `<Dialog>`/`<Field>` components are introduced, and no overlay's keyboard behavior changed.
5. The creation flow renders through the gradient chrome band with an in-band "Step N of 4"
   indicator and Cancel/Back; the floating `StepBadge` is gone; the flow starts at
   `create/leagues` under the band, Save List stays a standalone boot screen.
6. Empty states are text-led `text-secondary` centered lines with `Clear all filters` where
   filtering caused the emptiness and Squad's two sanctioned action buttons; no icons.
7. Structural errors render the danger alert panel with a `BTN_SECONDARY` Retry;
   `RouteParamErrorScreen` uses the grammar with no Retry; inline errors are danger lines.
8. The visual-design-language spec documents the full non-table grammar per this note.

## Risks

- **Prose enforcement for the empty/error grammar.** The empty/error patterns are prose doctrine,
  not a constant or a lint rule, so a new screen can still invent its own recipe. The
  `no-slate-class-name` guard catches palette drift but not recipe drift; the spec is the only
  mitigation. Watch the first post-adoption screens for drift and route a third recurrence to a
  lint rule per the repository's routing discipline.
- **Two chrome-band-like components.** Career chrome (login) and the creation band (pre-career)
  are structurally different (tab strip vs step indicator) but visually siblings; a later pass
  could lift a shared gradient-band primitive. That is implementation, not a re-decision.
- **Field-surface legibility.** `--color-field-bg` is opaque and darker than the panel, so it
  must stay that way: a future opacity nudge makes text-entry unreadable over the page background
  and contradicts the point of the token.
- **Dialog unification touches hot surfaces.** The command palette, help, and spine hand off to
  each other on open/close; re-skinning their shell is visual-only, but an implementor who crosses
  the line into the spine's dispatch or the focus contract breaks the keyboard layer. The
  acceptance criterion "no keyboard behavior changed" exists to force that line.