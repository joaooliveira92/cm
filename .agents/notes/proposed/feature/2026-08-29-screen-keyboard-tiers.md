# Agent Note: Screen keyboard tiers

Status: proposed

## Problem

The keyboard-first effort targets level 3 (mouse-free) overall, but the nine screens of the `@cm-clone/desktop` renderer vary enormously in complexity, interaction surface, and pacing. Assigning every screen level 3 is wasteful and, for some screens, indistinguishable from level 1. A tiering rule was needed to decide which screen reaches which tier, with a floor that anchors the whole effort.

## Proposal

All nine screens unconditionally meet **level 1** (reachable — correct tab order, visible focus ring, Enter/Space on every control). No screen sits below level 1.

A screen stays at level 1 (skipping levels 2 and 3) iff it has **zero interactive controls beyond nav/back** — no buttons, no forms, no table rows to select, no action to take. If it has any actions, it must reach at least level 2 on its primary action. Level 3 is for screens with tables requiring grid navigation or dense multi-row interaction.

Per-screen assignment:

| Screen | Level | Rationale |
|---|---|---|
| MatchDayScreen | 3 | Entire point of keyboard-first — time-pressured, pause-needed, substitutions during live play |
| TransfersScreen | 3 | Four tables, per-row actions, bid inputs — all need full keyboard |
| TacticsScreen | 3 | Formation selector, sliders, dropdown table — dense interaction surface |
| SquadScreen | 3 (grid) | 30-column read-only table — keyboard nav is the interaction |
| LeagueTableScreen | 2 | One read-only table + one button; grid nav is optional, primary-action shortcut covers it |
| CreationStep1 | 2 | Linear form fields and buttons — full tab nav covers it; no table or multi-row interaction |
| FixturesScreen | 1 | Zero interactive controls — read-only list |
| SeasonSummaryScreen | 1 | Zero interactive controls — read-only cards and banners |
| ClubSelectionScreen | 1 | Zero interactive controls — read-only card list |

The native `prompt()` call at `TransfersScreen.tsx:57` is replaced with an inline modal dialog (text input + OK/Cancel, focus trapped, Enter to submit), reusable across screens.

## Alternatives considered

- **All screens level 3.** Discarded as wasteful — Fixtures, Season Summary, and Club Selection have no interactions to make keyboard-reachable, and level 3 is indistinguishable from level 1 there.
- **All screens level 1.** Discarded as insufficient — Match Day, Transfers, Tactics, and Squad all need full keyboard access to deliver a keyboard-first product.
- **Level 2 as floor, level 3 per screen.** Considered but discarded because level 2 is about a primary-action shortcut, and a screen with zero actions can have no primary action to shortcut.
- **Per-screen bespoke assignment with no rule.** Discarded — the ticket specifically asked for a rule so new screens can be tiered without re-litigation. The zero-interactive-controls rule covers the three read-only screens cleanly.

## Acceptance criteria

- The map's ticket 04 is resolved with the tier assignment above.
- All nine screens have their tier recorded and visible in the spec.
- Future screens can be tiered without reopening this decision: if it has any interactive control beyond nav/back, level 2 minimum; level 3 for tables and dense interaction.
- `prompt()` is removed from TransfersScreen and replaced with a reusable modal dialog before implementation begins.

## Risks

- A screen that currently has zero controls (ClubSelection, SeasonSummary) may later gain them, at which point the tier must be revisited. Low risk — product changes of that magnitude would go through a separate effort.
- Level 2 is loosely defined ("global shortcut for the primary action") and depends on ticket 05 to specify the global key map shape. If the key map cannot support per-screen primary-action shortcuts, level 2 may collapse into level 1 or 3. That risk is borne by ticket 05.