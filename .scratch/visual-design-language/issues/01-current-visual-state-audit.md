# 01 — Current visual state audit

Type: research
Status: resolved

## Question

What is the current visual state of the `@cm-clone/desktop` renderer, cataloged against the CM 03/04 UI reference at `docs/ui-elements.md`?

Survey every screen and shared component in `apps/desktop/src/renderer/` and document:

1. **Colors and backgrounds**: What colors are used (Tailwind semantic names, hex values)? How do they compare to CM 03/04's beveled panels, shaded title bars, slate/beige palette? Are there context-sensitive backgrounds per screen?

2. **Typography**: Font family, sizes, line heights used. Compare to CM 03/04's "small typography intended for 1024×768" and "tight row spacing."

3. **Panels and containers**: Are there beveled/shaded panels, title bars, bordered sections? CM 03/04 used "beveled panels, shaded title bars" throughout. The clone currently uses flat Tailwind surfaces.

4. **Tables**: Current column density, row height, text size. Compare to CM 03/04's dense multi-column squad tables with compact status abbreviations.

5. **Buttons and controls**: Current button styling vs CM 03/04's "rectangular, text-led controls."

6. **Navigation structure**: How the current tab-bar nav compares to CM 03/04's hierarchical club-context navigation, contextual menus, and date/Continue bar.

7. **Status and data display**: How player status, positions, ratings are currently rendered vs CM 03/04's abbreviated markers.

8. **Skins and theming**: Does the current renderer support any skin/theme system?

9. **Icons and visual markers**: Current use of icons, colors for significance vs CM 03/04's "limited use of iconography."

For each item, note whether the clone currently: (a) matches the CM 03/04 pattern, (b) uses a modern/modified approach, or (c) has no equivalent. Collect file:line evidence.

## Answer

The full research note is at `docs/research/visual-design-language-current-state.md`.

Summary of the 9-item audit:

1. **Colors & backgrounds** — (b) Flat dark slate (`bg-slate-950`) throughout 9 screens. No bevels, no gradients, no context-sensitive backgrounds. The `components/match-screen/` prototype uses chrome-blue gradients and semi-transparent panels but is unconnected to the app.

2. **Typography** — (b) Tailwind default sans-serif. `text-xs` (12px) to `text-2xl` (24px). Similar apparent size to CM but different face, no compact/abbreviated strategy.

3. **Panels & containers** — (c) No beveled/shaded panels anywhere in main screens. One `border rounded p-4` box on SeasonSummaryScreen is the only panel-like element. No title bars, no icon zones.

4. **Tables** — (b) Compact rows (`py-1` = 4px padding) but wider text (12-14px vs ~11px). Squad table has ~34 columns with horizontal scroll — no view switching, no abbreviations, no clickable rows.

5. **Buttons & controls** — (b) Flat `rounded bg-slate-700` pattern — no 3D beveling, no borders, no inset shadows. Match-screen has gradient 3D-ish buttons but is not wired in.

6. **Navigation structure** — (c) Flat tab bar of peer screens. No hierarchical context, no persistent date/Continue bar, no contextual menus, no screen history.

7. **Status & data display** — (c) CM-style status abbreviations (Inj, Sus, Lmp, etc.). 

8. **Skins & theming** — (c) Light/Dark Mode suppport..

9. **Icons & visual markers** — (b) https://lucide.dev/ icons in match-screen componentMain screens are text-only. No icon library, no SVGs, no color-coded comparison.

Key finding: the `components/match-screen/` directory contains a design-language prototype that more closely approximates the CM 03/04 look (chrome-blue gradients, panel borders, hierarchical sidebar nav) but is unused by the live app. The main renderer uses a consistent but minimal flat dark slate approach.