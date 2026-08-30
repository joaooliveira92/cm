# 04-screen-keyboard-tiers

Type: grilling
Status: resolved

## Question

Which of the nine screens must reach which keyboard tier?

The tiers, each a superset of the last:

1. **Reachable** — correct tab order, visible focus ring, Enter/Space on every control.
2. **Driveable** — a global shortcut for the screen's primary action; mouse optional on common paths.
3. **Mouse-free** — every action keyboard-reachable, including table rows and form fields.

The screens are not equal. `MatchDayScreen.tsx` is 640 lines of live, time-pressured interaction
with a substitution panel, tactics sliders, and a paced commentary feed — keyboard control is the
entire point there. `FixturesScreen.tsx` is 56 lines of read-only list with no actions at all, and
level 3 may be indistinguishable from level 1 for it. `SquadScreen.tsx` is a 30-column read-only
table whose keyboard story is navigation, not action. `TransfersScreen.tsx` mixes a browsable market
list with per-row actions and a `prompt()` call for counter-offers that has no keyboard story at all.

Decide:

- **A tier per screen**, for all nine: Squad, Tactics, Transfers, League Table, Fixtures, Match Day,
  Season Summary, Club Selection, and the career-creation flow (`App.tsx` + `CreationStep1.tsx`).
- **What justifies a screen sitting below level 3**, stated as a rule rather than per-screen taste,
  so new screens can be tiered without reopening this.
- **The floor**: whether level 1 is unconditional across all nine, which is the difference between
  "keyboard-first where it counts" and "keyboard-first".
- **`prompt()` in `TransfersScreen.tsx`** — a native modal in the counter-offer path. Whether it
  survives at all is a tiering consequence worth naming here.

The destination is level 3 overall; this ticket decides where that binds and where it does not.

## Answer

**Six screens at level 3 or 2, three at level 1; `prompt()` replaced by an inline modal.** See [Agent Note](/.agents/notes/proposed/feature/2026-08-29-screen-keyboard-tiers.md).
