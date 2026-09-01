# 07 — Layout grammar beyond tables

Type: grilling
Status: resolved

> Graduated from the map's Not-yet-specified on 2026-08-31, following resolution of the
> dense-table (03) and career-chrome (04) decisions. Forms, dialogs, the career-creation
> flow, and empty/error states are the residues those two decisions left unpatterned.

## Question

What visual pattern do forms, dialogs, the career-creation flow, and empty/error states
share, given the adopted panel, chrome, and table systems?

### What is already settled (do not re-decide)

- Panel system (semi-transparent `--panel-bg`, chrome-blue title-bar variant, `8px 12px`
  padding) from the visual-design-tokens decision.
- Typography (12px body, 18px page title, 14px section) and the two-tier button system
  (gradient-primary, flat-secondary).
- Career chrome is the two-row frame (gradient title bar + tab strip). The creation flow
  sits outside `CareerChrome`: Save List → createLeagues → createStep1–3 render their own
  `<h1>` and a floating `StepBadge` progress indicator today.
- No onboarding inbox (decided). The creation screens exist and are styled ad hoc.

### Decide

1. **Form field styling** across the creation flow (league-list selection, text inputs, the
   manager form): a shared field pattern drawn from the token system, stats, and focus-ring
   conventions.
2. **Dialog pattern**: quit-confirm, Preferences/Credits, match-readiness, command palette,
   and help overlays all exist. Is there one consistent modal chrome + scrim worth fixing?
3. **Creation-flow frame**: does the flow get its own lightweight chrome analogous to
   `CareerChrome` (identity, step indicator, back), or stay screen-owned headings?
4. **Empty and error states**: `RouteParamErrorScreen`, retry rows, empty tables — what does
   a patterned text-led empty state look like (no icons, per the iconography decision)?

### Output

A section of the spec covering non-table layout grammar: forms, dialogs, creation-flow
frame, and empty/error states.

## Answer

**Four patterns: `FIELD_*` constants + a new `--color-field-bg` token (constants, not components);
`MODAL` constants + a documented anatomy (gradient chrome title band, strong-panel body, two
sizes, uniform scrim-click) — never a `<Dialog>` component; a lightweight pre-career chrome band
with an in-band "Step N of 4" indicator replacing the floating `StepBadge`; and a text-led
empty/structural-error/inline-error grammar with `BTN_SECONDARY` Retry. Behavior (focus trap,
Escape, overlay focus restore) is explicitly untouched — that is the focus model's, not this
map's.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-31-layout-grammar-beyond-tables.md).

## Comments

- 2026-08-31 — Human approved all four frontier decisions (fields, dialog chrome, creation-flow
  frame, empty/error states) in one pass. Notable fact corrections from exploration: quit-confirm
  has no renderer component (open feature ticket elsewhere), and "match-readiness" is inline
  content (disabled Start button / Continue-blocked reason), not an overlay — the spec must not
  invent a match-readiness modal.