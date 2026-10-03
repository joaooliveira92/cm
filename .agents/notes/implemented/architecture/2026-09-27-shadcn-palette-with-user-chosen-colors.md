# Agent Note: shadcn palette with a user-chosen base and theme color

Status: implemented

## Problem

The renderer opened in the retro chrome-blue frame from [Visual design tokens](2026-08-29-visual-design-tokens.md): blue gradient title bars, blue primary buttons, blue-tinted greys, and yellow headings and focus rings. The owner wanted a neutral first launch in the style of shadcn/ui. They also wanted shadcn's two colour axes, a base color and a theme color, as a user choice. That note had deferred runtime skin switching.

## Decision

The palette is shadcn's, and the user picks it in Preferences on two independent axes.

- **Palettes.** `apps/desktop/src/renderer/appearance/palettes.css` holds the dark `cssVars` of shadcn's registry (`apps/v4/registry/themes.ts`), generated verbatim. There are seven base colors (Neutral, Stone, Zinc, Mauve, Olive, Mist, Taupe) keyed on `html[data-base-color]`, and seventeen theme colors keyed on `html[data-theme-color]`. Theme blocks follow base blocks at equal specificity, which reproduces shadcn's `{ ...base, ...theme }` merge. The Neutral theme has no block, so it keeps the base's own primary. Plain `:root` carries Neutral, so the first launch needs no attribute.
- **Roles map onto the palette.** Every `--color-*` role token in `index.css` either is a palette variable or is a `color-mix` of two of them. The shadcn role bridge now points at the same-named palette variable rather than at the chrome tokens. The only literal colours left are domain hues with no shadcn counterpart: warning, danger, success, and the pitch.
- **What moved in meaning.** `primary` is the theme color and paints `BTN_PRIMARY`, the `Button` default, and the sidebar's active mark. The chrome gradient is now a faint lift off `card` rather than a hue. `text-highlight` is the theme's `chart-1`, which is light grey under Neutral. The focus ring is shadcn's `ring`, no longer yellow. `row-selected` is `primary` mixed 16% into the background.
- **Persistence.** `appearance.ts` stores the pair in renderer-local `localStorage` beside the column preferences. It reconciles each axis on its own, and `main.tsx` applies it before the first render. It is a machine preference, not save data, so no IPC or schema change.

The renderer stays dark-only. Only the `dark` half of each registry entry is used.

## Alternatives considered

1. **Retune the chrome-blue literals to greys.** This is one edit and fixes the first launch. It does not give the user a choice, and it leaves every colour as a hand-picked literal that drifts from shadcn.
2. **Pure shadcn class names everywhere (drop the role tokens).** This would rewrite hundreds of call sites for no visual gain. The role layer exists so the palette can change underneath it, and it now does.
3. **Light mode alongside.** Not asked for. The translucent panels over the backdrop photograph assume a dark plate, so light mode is a separate design question, not a palette swap.

## Consequences

- The focus ring lost its yellow. Under Neutral it is `oklch(0.556 0 0)` on `oklch(0.145 0 0)`, which meets 3:1 for a non-text indicator but is quieter than before in a keyboard-first app. If it proves hard to find, raise it on its own token rather than bringing back a fixed hue.
- `palettes.css` is generated. Change it by regenerating from the registry, so every value stays checkable against upstream.
- A future `shadcn add` component works unmodified: its role classes resolve through the bridge into whichever palette is active.
