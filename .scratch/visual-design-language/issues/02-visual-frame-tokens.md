# 02 — Visual frame and design tokens

Type: task
Status: resolved
Blocked by: 01

## Question

What are the concrete visual design tokens for the cm-clone renderer, informed by `docs/design/ui-elements.md` and the current state audit (ticket 01)?

Decide for each token category:

1. **Color palette**: What is the base background color (CM used beige/tan panels on a dark or photo background)? Panel surface colors, title bar colors, text colors (primary, muted, accent), selection/highlight colors, border colors for beveled containers.

2. **Typography**: Font family (CM used what was available on early-2000s Windows/Mac — likely Tahoma, Verdana, or MS Sans Serif). Font sizes for headings, table body, status abbreviations, labels. Line height for dense tables.

3. **Panel system**: Are panels rendered with beveled/raised borders (simulating CM's shaded title bars and beveled panels)? What does the panel header look like? Is there a standard container pattern used across screens?

4. **Background system**: Does the clone use a single flat background or context-sensitive backgrounds per screen/club? If the latter, what's the source of background images?

5. **Button style**: Are buttons flat (current Tailwind default) or beveled/raised (CM style)? What about the primary action button (Continue Game)?

6. **Spacing and density**: What is the target row height for tables? Minimum column width? Padding around panels? CM was designed for 1024×768 with tight spacing — does the clone target the same density?

7. **Iconography**: Does the clone use icons at all (current: none beyond Tailwind), and if so, which ones and where? CM used "limited iconography, text-led."

Produce a set of CSS custom properties (Tailwind theme extensions or `:root` variables) that encode these decisions.

## Answer

**Retro chrome-blue visual frame adopted.** CSS custom properties for palette (dark base, chrome-blue gradients, panel-dark surfaces), typography (Trebuchet MS, 12px table body), panel system (semi-transparent bordered containers), two-tier buttons (gradient primary, flat secondary), and compact spacing (py-0.5 rows). Skin system deferred. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-visual-design-tokens.md).