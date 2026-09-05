# Agent Note: Adopting shadcn/Base UI components under the chrome-blue frame

Status: proposed

## Problem

The visual design language landed as a token layer plus a set of shared class strings
(`renderer/theme.ts`: `PANEL`, `BTN_PRIMARY`, and siblings). That file's own header argues
against a component library: panels and buttons are "styled containers with no insides", so a
constant beats a `<Panel>`.

That reasoning holds for a panel. It does not hold for the surfaces the renderer still owes:
dialogs, popovers, selects, tooltips, comboboxes, scroll areas, sheets. Each of those is a
focus trap, a positioning problem, a dismissal policy, and an ARIA contract — insides, not
styling. `renderer/dialog/LightweightDialog.tsx` and `renderer/transfers/InlineModal.tsx` are
the first two hand-rolled answers to that class of problem, and the frontier tickets queue up
more.

Building those from scratch, screen by screen, is the expensive path to a worse result.

## Proposal

**Adopt the shadcn component set (Base UI variant) as the renderer's primitive layer**, styled
through the existing chrome tokens rather than through shadcn's default palette.

- **Vendored, not depended on.** `renderer/components/ui/*` are source files in this tree, as
  shadcn intends. They can be edited freely; they are not an upgrade treadmill.
- **The token bridge, not a rewrite.** The components are written against shadcn's role names
  (`bg-background`, `text-muted-foreground`, `ring-ring`). `index.css` declares each of those as
  an alias onto the chrome tokens, in one block, so the upstream files stay upstream-shaped and
  inherit the retro frame with no per-component edit. A skin override still repaints them,
  because they resolve through the same variables. Same tactic as the `--color-slate-*` layer,
  except permanent rather than a migration backlog.
- **Density is a local customization.** shadcn ships marketing-page padding (`p-6` cards, `p-3`
  cells). `card.tsx` and `table.tsx` are retuned once to the density contract from
  [Dense table visuals and the player-status vocabulary](../../implemented/architecture/2026-08-31-dense-table-and-status-vocabulary.md)
  (`px-2 py-0.5`, 12px body) rather than corrected at every call site.
- **`theme.ts` survives for what it is good at.** Panel and button class strings remain valid
  for the plain styled containers they were written for. The component layer takes the surfaces
  that carry behaviour.

### What "adopted" means here

Every screen in the renderer is converted, not a representative sample. Save list, creation flow,
league selection, squad, tactics, transfers, match day, league table, season summary, manager
profile, fixtures, club selection, the shared table layer, both dialogs, the command palette and
the help overlay now render through `components/ui/*`. Two consequences fall out of that:

- **The `slate-*` migration finished.** All 391 recorded call sites are gone
  (`scripts/slate-baseline.json` is `{}`), so the `--color-slate-*` alias layer in `index.css`
  has been deleted. The guard stays on; there is simply nothing left in the backlog. The
  incremental adoption path in the spec was followed to its end rather than abandoned.
- **`lucide-react` replaced the hand-drawn SVGs** in the save-list chrome bar, whose path data
  was malformed.

### The constraint that governs adoption

The keyboard spine — the Action registry, `renderer/focus.ts`, roving tabindex, `g <key>`
navigation, the command palette — is shipped code, and the shared table layer
(`table/DataTable.tsx`, `table/TablePanel.tsx`) owns roving focus and selection-vs-focus. Base
UI components ship their own focus management. **Where the two meet, the spine wins.** A
component whose focus behaviour cannot be reconciled with the spine is not adopted; the table
layer keeps its bespoke focus model and takes only visual classes from `table.tsx`.

### Where the spine already won

Three concrete places, all found by the existing tests rather than by argument:

- **`Button` renders a native `<button>`, not `@base-ui/react`'s Button.** Base UI writes an
  explicit `tabindex="0"`, and the level-1 contract is that controls are natively focusable with
  no tabindex override — so a roving-tabindex composite is the only thing in the renderer that
  sets one. Base UI's Button exists for non-`<button>` render targets and buys nothing here.
- **Native `<select>` stays.** The vendored `select.tsx` is a Base UI listbox with its own focus
  and typeahead; a native select is already keyboard-complete. Only its paint is borrowed.
- **The dialogs keep `useDialogKeyboard`.** `dialog.tsx` and `alert-dialog.tsx` bring their own
  focus trap; the initial-focus, Tab-trap and Escape policy is the spine's, and it is tested.
  The dialogs take the panel anatomy and the buttons, not the behaviour. The same holds for the
  command palette, which ranks registry Actions and cannot be handed to `cmdk`.

## Consequences

- New dependencies: `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`,
  `lucide-react`, `cmdk`, `motion`.
- Imports stay relative with explicit `.js` extensions, matching the tree. No `@/` alias: the
  repo is `moduleResolution: nodenext`, under which extensionless path mapping does not resolve.
  Components pasted from the registry need their `@/` imports rewritten on arrival.
- One test changed meaning rather than being accommodated:
  `tactics-keyboard-reachability` asserted the selected formation by class name (`bg-slate-100`)
  and now asserts `aria-pressed`, which is what a screen reader reads and what survives a
  restyle. `slate-guard-lint` was reconciled with the retired alias layer.
- A latent bug in the guard surfaced: `no-slate-class-name` matched `slate-` as a bare
  substring and so fired on `translate-x-1/2`. Fixed with a left boundary in
  `scripts/effect-lint.ts`.
- `lucide-react` introduces the renderer's first icon set, against a reference UI
  (`docs/design/ui-elements.md`) that is text-led and abbreviation-driven. Icons stay decorative and
  optional; no status is communicated by icon alone.
