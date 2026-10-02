# 02: Renderer screen and style inventory

Type: task
Blocked by:
Status: resolved

## Question

What exactly will the restyle touch? Produce an inventory, written under this effort as
`inventory.md`, of:

- every routed screen (from `router/index.tsx` and the pre-career and match routers), grouped by
  sidebar section (Team, Operations, Club & World, match day, pre-career);
- for each, which shared pieces it is built from (`components/ui` primitives, `theme.ts` constants,
  `components/reui` grids) versus bespoke classes, and whether it uses the backdrop;
- the app chrome pieces and every dialog, popover and palette;
- the Playwright specs that reach each screen;
- every consumer of the appearance preference (`appearance/`, `palettes.css`, the `theme-neutral`
  variant, `data-theme-color`).

AFK: the agent does this alone. It unblocks the foundation prototype and the group slicing.

## Answer

**Written to [inventory.md](../inventory.md).** About 60 routed screens in five groups plus a sixth,
drill-downs (club, player, staff and competition surfaces no sidebar section owns), and eleven
13-line placeholders that inherit the shell. The shared layer reaches far: `Button` is imported by 67
files, `Alert` by 36, the `PANEL` and `MODAL_*` constants by up to 11, so restyling it carries most
screens. Bespoke styling concentrates in tactics (248 `className`), match (152), training (145),
managerProfile (130), scouting (123) and create (107); only 11 Tailwind default-palette classes
exist app-wide. The appearance preference has nine consumers. 27 unit-test assertions across 11
files check class names; no Playwright spec asserts on styling.
