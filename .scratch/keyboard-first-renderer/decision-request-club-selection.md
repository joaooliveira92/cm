# Decision Request: a new career can never be created — Club Selection never selects a club

Written when a stop condition fired during review of the keyboard-first-renderer effort. Saved to
`.scratch/keyboard-first-renderer/decision-request-club-selection.md`.

A decision request is not a request for permission. It is a request for a **decision only a human can
make**: one that changes what the game is, not how it is built.

## Question

What sets the player's club when creating a career? Today the renderer commits creation with a
placeholder club id (`ClubId.make("temp-club-id")`), no club ever matches it, and `commitCareer`
fails in main — so no career has ever been creatable through the UI.

## Why this is blocking

AC-13's happy path ("beginCareer still runs before Club Selection…") is untestable and the creation
flow's only terminal is a failure that resets to step 1. The `ClubSelectionScreen` is a tier-1
read-only list (keyboard-first ticket 04); nothing in the renderer ever selects among its entries, so
the defect is not a routing choice — it is a missing product mechanism. The fix must decide how club
selection happens, which is a game-shape decision, not a plumbing one.

## What is already settled

- `beginCareer` runs before Club Selection because club selection depends on the generated world and
  persisted economy it produces (`router-adoption-shape` note, AC-13).
- Creation is a separate scope from the keyboard-first `g <key>` destinations (ticket 05).
- `ClubSelectionScreen` is tier 1 (read-only list of clubs) and is not a `g` destination.
- The renderer must never own authoritative state; the club choice is a command input that persists
  when committed.

## Options

### Option A — Selectable club cards with explicit selection

Make `ClubSelectionScreen` (or the creation flow's step) render clubs as selectable cards; selection
sets `selectedClubId` in the provisional session; commit uses that id.

- **What the player experiences**: picks their club from the generated world and starts a career.
- **What it costs to build**: a selection state in the creation session + accessibility (the card
  list is currently tier 1; tiering may need review).
- **What it forecloses**: nothing.
- **Save compatibility**: none.

### Option B — Single playable club

Remove the choice: the game starts with one fixed playable club (a rule of the League), and Club
Selection is cosmetic or removed.

- **What the player experiences**: starts with a fixed club every time.
- **What it costs to build**: least; drops a screen's purpose.
- **What it forecloses**: manager customisation of which club to manage; contradicts the existing
  `club-selection-at-new-game` Agent Note if that is still active.
- **Save compatibility**: none.

### Option C — Assign a club at `beginCareer`

Main assigns the player club automatically (e.g. lowest Stature Tier) during `beginCareer`, and the
selection screen is later customisation.

- **What the player experiences**: no choice at creation; club fixed by main.
- **What it costs to build**: small main-side default; selection screen becomes a display.
- **What it forecloses**: real club choice.
- **Save compatibility**: none.

## Recommendation

Option A. It is the only one that preserves the existing `club-selection-at-new-game` decision and
resolves the tier-1 tension (the "screen with zero interactive controls" tiering was written when the
screen was read-only; a selectable card list is legitimately level-2+ interaction). Before building,
check whether the `club-selection-at-new-game` Agent Note (`.agents/notes/proposed/feature/`) is the
governing decision and supersede it only if a human overrides. The fix lands as its own ticket,
outside this effort's routing scope.