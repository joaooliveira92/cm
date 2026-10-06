# Agent Note: The CM 03/04 look replaces the appearance picker

Status: proposed

## Problem

The renderer's colours come from shadcn's palettes, chosen by the user in Preferences on two axes
(7 base colors × 18 theme colors), per
[shadcn palette with a user-chosen base and theme color](../../implemented/architecture/2026-09-27-shadcn-palette-with-user-chosen-colors.md).
The app is being restyled end to end in the Championship Manager 03/04 look the Tactics editor
established: CM blue pill buttons, yellow panel titles and hints, translucent panels over the
backdrop photograph. A fixed period look and a user-tintable palette pull against each other, so
the restyle has to decide whether the picker survives and what every colour role becomes.

## Proposal

The CM look will be the renderer's only look, and the appearance picker will be removed.

- **Preferences.** The "Base color" and "Theme color" swatch groups will be removed from the
  Preferences dialog. The dialog stays for its other sections (the commentary file).
- **Stored choice.** On startup the renderer will delete the `@cm-clone/desktop:appearance` key
  from `localStorage` once, so no unread preference lingers.
- **Code removed, not kept dormant.** `appearance/palettes.css`, the option lists and persistence in
  `appearance/appearance.ts`, the startup apply in `main.tsx`, the `theme-neutral` custom variant in
  `index.css` and its one use in `squad/SelectionIndicator.tsx`, and the appearance test will be
  deleted. Git keeps them.
- **Colour roles.** Every role keeps its name and gets one fixed CM colour; exact values are tuned
  in the foundation prototype, the roles are fixed here:

  | Role | CM colour |
  |---|---|
  | `background` | very dark navy |
  | `card` (panel) | translucent near-black over the photograph, as on Tactics |
  | `popover` | solid dark navy, never translucent, so menus stay legible over anything |
  | `foreground` | near-white |
  | `muted-foreground` | cool grey-blue |
  | `border` | thin translucent white |
  | `primary` | CM glossy blue (buttons) |
  | `chart-1` (`text-highlight`) | CM title yellow, `#ffff33` in the Ter 03-04 skin |
  | a new value role | CM value yellow, `#ffd000`, rising to `#fff000` for attributes of 15+ |
  | `ring` (focus) | CM title yellow |
  | `destructive` | CM red |
  | `sidebar` | dark navy; active item CM blue |

- **Two yellows, as CM had.** The pale title yellow (`#ffff33`) marks panel titles, hint lines, the
  manager's own club, highlight and selection, and the focus ring. The value yellow (`#ffd000`,
  `#fff000` for attributes of 15 or more) colours values: attributes, money, competition names, as
  the game's own skin files do ([CM 03/04 screen reference](../../../../docs/research/cm-0304-screen-reference.md)).
  Neither colours body text, labels or buttons. Both must pass the AA contrast test on the panels.
- **Unchanged.** The club-painted header
  ([club colours and the header scope](../../implemented/architecture/2026-09-03-club-colours-and-the-header-scope.md))
  and the backdrop photograph stay. The role-token layer stays, so components keep reading roles,
  not literals.

## Supersession

This fully supersedes
[shadcn palette with a user-chosen base and theme color](../../implemented/architecture/2026-09-27-shadcn-palette-with-user-chosen-colors.md):
its palettes, picker, persistence and role-to-palette bridge are all replaced here. That note
recorded the move *away* from a chrome-blue look with yellow headings and focus rings
([visual design tokens](../../implemented/architecture/2026-08-29-visual-design-tokens.md)) because
the owner then wanted a neutral first launch; this reverses that on the owner's decision for the CM
restyle. Archive the shadcn-palette note once this one is implemented.

## Alternatives considered

1. **CM as the default, picker kept to tint it.** Rejected: a CM look tinted mauve or olive is no
   longer CM, and every screen would have to be checked against 126 combinations.
2. **CM as one option beside the modern look.** Rejected: two looks double what each screen must be
   verified against, for a choice nobody asked to keep.
3. **Keep the palette code dormant.** Rejected: dormant code still has to compile, lint and pass
   tests, and the decision rules the picker out; git history is the way back.
4. **A backdrop on/off switch in place of the picker.** Not asked for; a separate idea.

## Acceptance criteria

- Preferences shows no colour options; its other sections are unchanged.
- No source file reads `data-base-color`, `data-theme-color` or the appearance storage key, and the
  key is gone from `localStorage` after one launch.
- Every `--color-*` role resolves to a CM value; no shadcn palette variable remains.
- The title yellow appears only in titles, hints, own club, highlight, selection and focus; the
  value yellow only on values; neither on body text, labels or buttons, and both pass AA.

## Risks

- A user who picked a palette loses it without notice. Accepted: the look is now the product's,
  not a preference.
- A future `shadcn add` component still resolves through the role bridge, but now into CM colours;
  a primitive that hard-codes its own palette needs restyling on arrival.
- If the CM yellow focus ring proves too close to yellow titles to read as focus, raise the ring on
  its own token (thicker or offset) rather than changing its hue.
