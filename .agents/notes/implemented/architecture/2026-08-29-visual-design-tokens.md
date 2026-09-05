# Agent Note: Visual design tokens and chrome-blue retro frame

Status: implemented

## Problem

The cm-clone renderer had no visual design language informed by the CM 03/04 reference (`docs/design/ui-elements.md`). All nine screens used a flat dark slate palette (`bg-slate-950`) with default Tailwind typography, no panel system, no status abbreviations, and no skin architecture. An unwired chrome-blue prototype in `components/match-screen/` (deleted since; recoverable at its recorded historical revision) carried a look that approximated the CM 03/04 tone, but its tokens were designed for a single match-day display rather than a coherent system.

Without adopted design tokens, every screen was individually styled and the renderer had no visual identity.

## Decision

Adopt a retro chrome-blue visual frame across every career surface, grounded in the CM 03/04 analysis at `docs/design/ui-elements.md` and the former match-screen prototype. It shipped as the renderer's only visual language: every screen renders through the token system below, `scripts/slate-baseline.json` is empty, and no flat `slate-*` class has entered the tree since the guard landed.

**Mechanism.** The `:root` + Tailwind `theme.extend` plumbing proposed below is a Tailwind 3 answer that does not run on this repo's Tailwind 4; it is superseded by [Token adoption mechanism and migration strategy](../../proposed/architecture/2026-08-31-token-adoption-and-migration.md). The decision is one non-inline `@theme` block in `apps/desktop/src/renderer/index.css`: role-named `--color-*` tokens are emitted as custom properties on `:root` *and* generate utilities that reference them via `var()`, so a future skin override is a scoped re-declaration rather than a new foundation.

**Primitive layer.** Dialogs, popovers, selects, and tooltips — surfaces with insides — come from the vendored shadcn/Base UI set under `apps/desktop/src/renderer/components/ui/`, styled through a role-name bridge onto these same tokens; see [Adopting shadcn/Base UI components under the chrome-blue frame](../../proposed/architecture/2026-08-31-shadcn-component-adoption.md). Panels and buttons — styled containers with no insides — remain shared class strings in `renderer/theme.ts` (`PANEL`, `PANEL_STRONG`, `PANEL_CHROME`, `BTN_PRIMARY`, `BTN_SECONDARY`) composing the same utilities every screen already uses, so the look below stands unchanged under both layers.

### Color palette

| Token | CSS custom property | Value | Usage |
|-------|-------------------|-------|-------|
| Base background | `--color-bg-base` | `#0a0e14` | Page-level background, darker than the former `#020617` |
| Chrome blue top | `--color-chrome-top` | `#416a9f` | Title bar / panel header gradient start |
| Chrome blue mid | `--color-chrome-mid` | `#214d84` | Gradient midpoint |
| Chrome blue bottom | `--color-chrome-bottom` | `#153963` | Gradient end |
| Panel surface | `--color-panel-bg` | `rgb(5 12 13 / 0.72)` | Semi-transparent content panel background |
| Panel surface strong | `--color-panel-bg-strong` | `rgb(6 10 12 / 0.86)` | Higher-opacity panel for focused/primary surfaces |
| Panel border | `--color-panel-border` | `rgb(255 255 255 / 0.3)` | Light border on panels |
| Panel border dark | `--color-panel-border-dark` | `rgb(0 0 0 / 0.4)` | Dark border variant |
| Text primary | `--color-text-primary` | `#e8edf3` | Primary text (slightly warmer than slate-100 `#f1f5f9`) |
| Text secondary | `--color-text-secondary` | `#8892a0` | Secondary text |
| Text highlight | `--color-text-highlight` | `#fff400` | Yellow accent for key info, focus rings |
| Text warning | `--color-text-warning` | `#ff7200` | Orange warning text |
| Text danger | `--color-text-danger` | `#ff4444` | Red error/danger text |
| Text success | `--color-text-success` | `#8ae860` | Green success text |
| Focus ring | `--color-focus-ring` | `var(--color-text-highlight)` | `:focus-visible` ring color |

The shipped set adds a neutral ladder above `secondary` (`--color-text-bright`, `--color-text-strong`, `--color-text-body`, `--color-text-muted`), the surface ramp the palette needs (`--color-bg-raised`, `--color-surface`, `--color-surface-raised`, `--color-border-subtle`), and an opaque field surface (`--color-field-bg`) so typed characters read against an unwashed background. The former `--accent-green` control token had no consumers and is gone; the `accent` role name is claimed by the shadcn role bridge as a hover surface, never a hue.

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| Font family | `"Jakarta Sans", "Trebuchet MS", "Segoe UI", Arial, sans-serif` | All UI text |
| Page title | `18px (text-lg)`, `font-bold` | Screen-level headings |
| Section heading | `14px (text-sm)`, `font-semibold` | Panel/section headings inside screens |
| Table body | `12px (text-xs)` | Squad table, all data tables |
| Status text | `11px` (`--text-2xs`) | Status abbreviations beside player names |
| Label/metadata | `12px (text-xs)` | Labels, input labels, column headers |

`Jakarta Sans` is **bundled, not assumed**: `@font-face` rules in `index.css` load the vendored faces at `apps/desktop/src/assets/fonts/JakartaSans/` (regular and italic), so the retro face renders identically on every system. `Trebuchet MS`, `Segoe UI`, and Arial remain as fallbacks behind it. Line height is `1.3` for table rows and the 11px status tier, `1.5` for prose.

### Panel system

Every content-bearing area renders inside a panel with:

```
border-radius: 6px          (--radius-panel)
border: 1px solid var(--color-panel-border)
background: var(--color-panel-bg)
box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.08), 0 2px 4px rgb(0 0 0 / 0.3)
padding: 0.5rem 0.75rem     (the compact py-2 px-3, not the old p-8)
```

The chrome/title-bar variant (`PANEL_CHROME`) replaces the tint with the three-stop gradient treatment below, a `--color-panel-border-dark` rim, and the chrome shadow. `PANEL_STRONG` is the higher-opacity body for focused or primary surfaces (modal bodies).

### Navigation frame

**Superseded as shipped** by [Career chrome frame and date/Continue bar](../../implemented/architecture/2026-08-31-career-chrome-and-date-continue-bar.md). The sidebar this note proposed was never built; `CareerChrome` keeps the shipped tab strip and restyles it in place — a gradient title bar owning club identity and a date/Continue cluster on the left-right axis, the active tab read as the framed locus via gradient inversion, Back-to-saves as a subdued chrome control, and horizontally scrollable tabs kept in the DOM.

### Button system

Two tiers, shipped as `BTN_PRIMARY` / `BTN_SECONDARY`:

**Primary buttons** (Continue, Create, Confirm): the chrome gradient (inverted while pressed), a 2px `--color-panel-border-dark` rim, `--radius-control` (4px) corners, the chrome shadow, brightened on hover, with the `primary: true` Action flag driving gradient-primary presentation only in the career chrome.

**Secondary buttons** (Cancel, Retry, inline actions): flat `--color-surface-raised` with an unshadowed hover to `--color-surface` — the same role the old `bg-slate-700 hover:bg-slate-600` played. Where a button carries behaviour (focus trap, dismiss policy) the shadcn `Button` renders a native `<button>` painted with this same two-tier look.

### Spacing and density

| Area | Target | Shipped |
|------|--------|---------|
| Table row height | `py-0.5` (2px) + 12px font ≈ 18px row | Dense-table contract, ticket 03 |
| Panel padding | `px-3 py-2` (12px × 8px) | `PANEL` / `PANEL_STRONG` |
| Column gap (table) | 8px | Shared table layer |

### Backgrounds

A single dark page gradient (`--color-bg-base` → `--color-bg-raised`), never per-screen photography — the semi-transparent panels need a predictably dark backdrop. `--page-image` is a reserved custom property defaulting to `none` and layering *under* the gradient wash, so a context-sensitive background (or, on match day, a future stadium photograph) injects later without restyling anything.

### Iconography

Text-led, per the CM 03/04 reference: Unicode and CSS shapes for functional markers (sort arrows, status dots), no status communicated by icon alone. The shadcn adoption introduced `lucide-react` for decorative chrome icons (its first user replaced save-list SVGs whose path data was malformed); it stays decorative, and emoji appears in match commentary only.

### Skin system

Deferred and gated. No runtime skin switching ships in v1; a skin is added only when at least two distinct visual themes are producible from the one component set and a use case justifies the complexity (accessibility contrast themes, a classic-vs-modern toggle). Because tokens are custom properties utilities reference through `var()`, a future skin is a scoped re-declaration of those properties — the foundation is decided, the shipping question stays fog.

## Alternatives considered

1. **Flat dark slate (the prior approach).** Keep Tailwind utilities with no token system and no retro frame. Cheaper now, but locks the renderer into a generic look with no path to CM 03/04 fidelity and every subsequent change requires component-by-component edits. Rejected.

2. **Period-accurate CM 03/04 beige/tan panels on photo backgrounds.** CM 03/04 used a football photograph as the page background with beige/tan semi-transparent panels. Rejected for v1: background images add load and complexity, the chrome-blue direction was already prototyped, and the dark theme was the existing convention across the renderer and the keyboard-first prototypes.

3. **Match-screen prototype tokens as-is.** Use the `components/match-screen/` custom properties verbatim for all screens. Rejected because those tokens were designed for a single match-day display (stadium overlay, specific opacities) and would not generalize to dense data screens like the squad table.

## Consequences

- **All eight acceptance criteria are met at HEAD.** One token block in `index.css` covers the palette, typography, panels, buttons, spacing, and background tokens; utilities consume them through `var()` (the `theme.extend` clause was superseded by the `@theme` mechanism); the career chrome renders the chrome-blue gradient title bar with the date/Continue area (ticket 04); content panels across squad, transfers, league table, fixtures, and season summary render through the panel tokens; the shared table layer ships the 12px / `py-0.5` density (ticket 03); buttons are the two-tier gradient-primary/flat-secondary system; `:focus-visible` resolves through `--color-focus-ring` (yellow); and no `slate-*` class remains — the alias layer is deleted, `scripts/slate-baseline.json` is `{}`, and the `no-slate-class-name` guard in `scripts/effect-lint.ts` blocks fresh flat-slate styling from the alias commit onward.
- **Font availability is no longer a risk.** Bundling Jakarta Sans replaces the "Trebuchet MS may not be installed" gamble while keeping the retro fallback chain for anything the bundle does not cover.
- **Panel transparency rests on a dark base.** The semi-transparent `--color-panel-bg` relies on the fixed dark page gradient; a future background image layers under the gradient via `--page-image`, so panel legibility survives without re-tuning opacity.
- **Migration cost was paid once.** The 391 `slate-*` call sites repainted atomically through `--color-slate-*` aliases with zero JSX churn, then renamed to role tokens; the alias layer never coexisted with a half-migrated screen.
- **The schematic look is a deliberate deviation from CM 03/04**, which was beige-on-photo. Chrome-blue is the contemporaneous football-management aesthetic and the token system keeps a move toward beige panels tractable as a scoped re-declaration if fidelity ever becomes the goal.
- **The guard learned one real-world case.** `slate-` matched as a bare substring and fired on `translate-x-1/2` before the vendored components landed; the left-boundary fix in `scripts/effect-lint.ts` (from the shadcn adoption) put that right, and the guard has been quiet since.