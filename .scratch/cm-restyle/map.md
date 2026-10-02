# Map: cm-restyle

Label: wayfinder:map

## Destination

A **spec**, at `spec.md` in this effort's directory, for restyling the whole renderer in the CM 03/04
look the Tactics editor established, sliced so `/to-spec` → `/to-tickets` → `/implement` can carry it
out across parallel sessions: a foundation slice, then screen groups. Plan-only; the map is done when
nothing is left to decide.

## Notes

- **Binding decisions** (settled with the human, 2026-10-02, when the effort was charted):
  1. The destination is a spec plus implementation tickets, not a decision record alone and not
     screens restyled as the plan goes.
  2. The CM look **replaces** the current look. The Preferences base/theme colour picker (7 base ×
     18 theme palettes in `appearance/palettes.css`) is retired, because CM's blue-and-yellow is fixed
     and a tinted CM is no longer CM. The club-painted header stays.
  3. **CM-inspired, not pixel-faithful**: CM's colours, panels, buttons, density, on the existing
     responsive layouts, controls and keyboard model. No fixed 1024×768 canvas, no bevels or
     textures, no font change; the `--text-*` type-scale roles stay.
  4. Scope is **everything the renderer draws**: every career screen, the app chrome (header,
     sidebar, bottom bar, menus, dialogs, command palette), the pre-career shells (main menu, new
     career flow, club selection) and match day.
  5. [.scratch/squad-instructions.md](../squad-instructions.md) is **superseded** as a binding
     spec and kept as reference for CM detail (density, colour naming, row striping).
  6. The look lives **in the shared layer**: the `--color-*` tokens in `index.css`, the vendored
     shadcn primitives in `components/ui` (customised in place), and `theme.ts`, so most screens
     inherit it unedited. `tactics/cmChrome.ts` folds into that layer.
  7. The photographic backdrop behind translucent panels stays, as does the club header paint.
  8. **Order**: a foundation slice first (tokens, primitives, chrome, picker retirement, Tactics
     reconciled onto it), then screen groups by sidebar section (Team, Operations, Club & World,
     match day, pre-career), which can run in parallel.
  9. A CM reference catalogue per screen kind is researched (ticket 01); screenshots the human
     supplies take precedence over it.
  10. Each implementation ticket's done-condition: before/after screenshots of its screens, its
      affected Playwright specs green, and WCAG AA text contrast on the translucent panels with the
      existing focus ring.
  11. **Look, not layout**, by default. A screen's layout changes only where the reference shows a
      clearly different CM arrangement and the human approves it in that group's ticket.
- **Prior art**: the Tactics editor (commits 10e3b47a, 8714ab1f, 16457228) and its Agent Note
  [the Tactics screen follows CM 03/04's own layout](../../.agents/notes/implemented/feature/2026-09-30-tactics-screen-follows-cm-0304-layout.md).
- **Skills every session should consult**: `grilling` and `domain-modeling` by default; `research`
  for 01; `prototype` for 03; `doc-standards` for anything written into `docs/`.
- **Shared worktree.** Other sessions commit to `dev` concurrently. Prototype and verification work
  runs in a detached worktree under `.claude/worktrees/` holding only this effort's files; research
  writes only under `docs/research/` and does no git operations.
- **Slice plan the spec must produce**: foundation (tokens, primitives, chrome, Preferences
  appearance retired, Tactics reconciled); then one slice per screen group; then a closing slice that
  reconciles the docs and Agent Notes and checks no screen was missed.

## Decisions so far

<!-- one line per closed ticket: gist, then link to the ticket file -->

- [CM 03/04 reference catalogue per screen kind](issues/01-cm-0304-reference-catalogue.md): exact Ter 03-04 skin colours from the game files; one shared frame (sidebar, club title bar, pill tabs, ticker bar); two yellows (titles vs values); per-kind layouts for squad, profiles, news, staff, finances, match day.
- [Renderer screen and style inventory](issues/02-renderer-screen-and-style-inventory.md): ~60 screens in five sidebar groups plus drill-downs, 11 placeholders; the shared layer (Button 67 files, Alert 36) carries most of the look; bespoke styling concentrates in six folders; 27 class assertions in unit tests, none in Playwright.
- [Retiring the appearance preference](issues/04-retiring-the-appearance-preference.md): swatches removed from Preferences, stored choice deleted on startup, palette code deleted; fixed CM role colours; two yellows as in CM (titles and selection; values), never body text or buttons.
- [The verification protocol](issues/06-the-verification-protocol.md): on-demand `@screenshots` spec at two sizes, eye comparison without pixel baselines, contrast gated on colour values, per-slice Playwright specs, each slice fixes what it breaks.

## Not yet specified

- **Per-group layout deviations.** Which screens, if any, the reference shows with a clearly
  different CM arrangement (decision 11). Decided per group once the catalogue and the inventory
  exist; may graduate into one prototype ticket per group or none.
- **Match day's own look.** The scoreboard paints both clubs' colours and the live match screens
  have their own feed and panels; how CM's match screen reads on top of that is unclear until the
  reference covers it.
- **Pre-career shells.** The main menu was hand-edited recently (`mainMenu.tsx`); whether the
  pre-career screens follow the career look exactly or a CM title-screen variant waits on the
  reference.
- **Dialogs, popovers and the command palette.** Whether they take the panel treatment or a solid
  CM window look.
- **e2e drift handling.** Specs that assert on visible chrome may need updating per group; whether
  that is in each group ticket or a shared sweep.

## Out of scope

- A selectable modern look kept alongside CM (decision 2).
- A pixel-faithful fixed canvas, bevels, textures or a period font (decision 3).
- Light mode: the renderer is dark-only today and stays so.
