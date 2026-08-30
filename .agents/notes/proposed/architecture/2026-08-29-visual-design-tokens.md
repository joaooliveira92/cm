# Agent Note: Visual design tokens and chrome-blue retro frame

Status: proposed

## Problem

The cm-clone renderer has no visual design language informed by the CM 03/04 reference (`docs/ui-elements.md`). All nine screens use a flat dark slate palette (`bg-slate-950`) with default Tailwind typography, no panel system, no status abbreviations, and no skin architecture. The `components/match-screen/` directory contains an unwired prototype with a distinct chrome-blue gradient + Trebuchet MS visual language that more closely approximates the CM 03/04 look — but this language is unconnected to the live app, and the prototype's specific tokens were designed for a single screen rather than a coherent system.

Without adopted design tokens, every screen is individually styled and the renderer has no visual identity. Adding visual treatment later is more expensive than defining the system now.

## Proposal

Adopt a retro chrome-blue visual frame across all career screens, inspired by the `components/match-screen/` prototype and grounded in the CM 03/04 analysis at `docs/ui-elements.md`. Encode every decision as CSS custom properties in a single `:root` block, consumed by all screens through Tailwind `theme.extend` and a shared global stylesheet.

### Color palette

| Token | CSS custom property | Value | Usage |
|-------|-------------------|-------|-------|
| Base background | `--bg-base` | `#0a0e14` | Page-level background, darker than current `#020617` |
| Chrome blue top | `--chrome-top` | `#416a9f` | Title bar / panel header gradient start |
| Chrome blue mid | `--chrome-mid` | `#214d84` | Gradient midpoint |
| Chrome blue bottom | `--chrome-bottom` | `#153963` | Gradient end |
| Panel surface | `--panel-bg` | `rgba(5, 12, 13, 0.72)` | Semi-transparent content panel background |
| Panel surface strong | `--panel-bg-strong` | `rgba(6, 10, 12, 0.86)` | Higher-opacity panel for focused/primary surfaces |
| Panel border | `--panel-border` | `rgba(255, 255, 255, 0.30)` | Light border on panels |
| Panel border dark | `--panel-border-dark` | `rgba(0, 0, 0, 0.40)` | Dark border variant |
| Text primary | `--text-primary` | `#e8edf3` | Primary text (slightly warmer than slate-100 `#f1f5f9`) |
| Text secondary | `--text-secondary` | `#8892a0` | Secondary/muted text |
| Text highlight | `--text-highlight` | `#fff400` | Yellow accent for key info, focus rings |
| Text warning | `--text-warning` | `#ff7200` | Orange warning text |
| Text danger | `--text-danger` | `#ff4444` | Red error/danger text |
| Text success | `--text-success` | `#8ae860` | Green success text |
| Accent green bg | `--accent-green` | `#15803d` | Primary action background (keep existing) |
| Focus ring | `--focus-ring` | `#fff400` | `:focus-visible` outline color |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| Font family | `"Trebuchet MS", "Segoe UI", Arial, sans-serif` | All UI text |
| Page title | `18px (text-lg)`, `font-bold` | Screen-level headings |
| Section heading | `14px (text-sm)`, `font-semibold` | Panel/section headings inside screens |
| Table body | `12px (text-xs)` | Squad table, all data tables |
| Status text | `11px` | Status abbreviations beside player names |
| Label/metadata | `12px (text-xs)` | Labels, input labels, column headers |
| Monospace data | Same as body | Numeric data in table cells (ratings, values) |

Line height: `1.3` for table rows, `1.5` for prose/descriptions.

### Panel system

Every content-bearing area is wrapped in a panel with:

```
border-radius: 6px
border: 1px solid var(--panel-border)
background: var(--panel-bg)
box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.3)
```

Variant for title bars/chrome headers:

```
background: linear-gradient(180deg, var(--chrome-top), var(--chrome-mid), var(--chrome-bottom))
border: 1px solid var(--panel-border-dark)
box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 3px rgba(0,0,0,0.4)
```

Panel padding: `8px 12px` (compact, not the current `p-8`).

### Navigation frame

Replace the flat tab bar with:
- A **persistent chrome-blue title bar** at the top containing: club name / section name, date/Continue bar (right-aligned), and optionally a club logo/crest area
- A **sidebar or contextual navigation** on the left or as a narrow section showing the current screen's place in hierarchy (deferred: for v1, keep the tab bar but restyle it with chrome-blue treatment)
- A **persistent date/Continue control** in the chrome title bar showing the current Matchday and a context-sensitive Continue button

### Button system

Two tiers:

**Primary buttons** (Continue, Create, Confirm):
```
background: linear-gradient(180deg, var(--chrome-top), var(--chrome-mid), var(--chrome-bottom))
border: 2px solid var(--panel-border-dark)
border-radius: 4px
box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.3)
color: white (--text-primary)
padding: 4px 12px
```
Active: invert the gradient direction. Hover: brighten the gradient.

**Secondary buttons** (Cancel, navigation tabs, inline actions):
Keep the current flat `bg-slate-700 hover:bg-slate-600` pattern with `border-radius: 4px` and no shadow. These are less prominent affordances.

### Spacing and density

| Area | Target | Current (for comparison) |
|------|--------|------------------------|
| Table row height | `py-0.5` (2px) + 12px font = ~18px row | `py-1` (4px) + 14px = ~24px row |
| Panel padding | `8px 12px` | `p-8` (32px page padding) |
| Between panels | `8px` | `mt-6` (24px) |
| Column gap (table) | `pr-2` (8px) | `pr-4` (16px) |

### Backgrounds

v1 uses a single dark gradient/patterned background on the page level, not per-screen photos. A `--bg-image` custom property is reserved and defaults to `none`, allowing context-sensitive backgrounds to be injected later without rewriting styles.

`background: linear-gradient(180deg, #0a0e14 0%, #121820 100%)` with an optional subtle noise or pattern overlay.

### Iconography

No dedicated icon library for v1. Use Unicode symbols and CSS shapes for functional markers (arrows for sort, colored dots for status categories). CM 03/04 used "limited iconography" and was text-led; the clone follows the same philosophy. Emoji is acceptable in match commentary only (existing pattern).

### Skin system

Deferred. The design token system is encoded in CSS custom properties, which makes a future skin system (swapping the `:root` block) architecturally straightforward — but no runtime skin switching ships in v1. The decision to add skins is gated on:
- At least two distinct visual themes being producible from the same component set
- A use case that justifies the complexity (e.g., accessibility contrast themes, a "classic CM" vs "modern" toggle)

## Alternatives considered

1. **Flat dark slate (current approach).** Keep the existing Tailwind utilities-based approach, no design token system, no retro frame. Cheaper now but locks the renderer into a generic look with no path to CM 03/04 fidelity. Rejected because every subsequent visual change would require individual component edits rather than token updates.

2. **Period-accurate CM 03/04 beige/tan panels on photo backgrounds.** CM 03/04 used a football photograph as the page background with beige/tan semi-transparent panels. This would require sourcing/piping background images and produces a warmer, less modern look. Rejected for v1 because: (a) background images increase load time and complexity, (b) the chrome-blue direction is already prototyped in the match-screen component, (c) the dark theme is the existing convention and all screens already reference it — a warmer palette would create a jarring visual break with the existing match-screen and keyboard-first prototypes.

3. **Match-screen prototype tokens as-is.** Use the `match-screen/styles.css` custom properties verbatim for all screens without modification. Rejected because those tokens were designed for a single match-day display (stadium overlay, specific opacity values) and would not generalize to dense data screens like the squad table.

## Acceptance criteria

1. A single `:root` CSS custom property block in `apps/desktop/src/renderer/styles.css` (or equivalent) covers all tokens defined above.
2. Tailwind `theme.extend` references the CSS custom properties, not hardcoded values.
3. The career nav bar shows chrome-blue gradient treatment with a date/Continue area.
4. Content panels across squad, transfers, league table, fixtures, and season summary screens use the panel token system (semi-transparent, bordered, shadowed).
5. Squad table uses `text-xs` (12px) body font with `py-0.5` row padding.
6. Buttons use the two-tier system: gradient-chrome primary, flat secondary.
7. `:focus-visible` uses `var(--focus-ring)` yellow.
8. Every CareerScreen component references token variables rather than hardcoded Tailwind classes — the tokens are the single source of truth.

## Risks

- **Font availability.** Trebuchet MS ships with Windows and some macOS versions but may not be on all systems. The fallback chain (`Segoe UI`, Arial, sans-serif) provides a graceful degradation that preserves the retro feel — this is acceptable for an Electron app where the system font is the target.
- **Panel opacity on busy backgrounds.** The semi-transparent panel approach (`rgba(5,12,13,0.72)`) relies on the background being sufficiently dark that text remains legible. If the background image/pattern changes, opacity may need adjustment. Mitigated by keeping the base background dark for v1.
- **Migration cost.** Converting all screens from hardcoded Tailwind utilities to the token system requires touching every screen component. This is a mechanical edit (replace class strings with references) sized for one implementation sprint — not a blocker but a real cost.
- **Chrome-blue is a specific retro aesthetic.** CM 03/04 did not use chrome-blue; it used a photo-background + beige panels. The chrome-blue direction is inspired by contemporaneous football management games (CM 01/02, early Football Manager) and the existing match-screen prototype. If fidelity to CM 03/04 specifically is the goal, this decision should be revisited. The design token system makes such a revisit tractable (swap the `:root` block) without rewriting components.