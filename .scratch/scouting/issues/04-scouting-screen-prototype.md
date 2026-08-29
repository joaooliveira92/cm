# Scouting screen prototype

Type: prototype
Status: claimed

## Question

Confirmed during charting: this milestone adds a seventh screen — a dedicated Scouting screen for
assigning/unassigning Scouts and viewing active assignments + Scouting Progress — rather than folding
assignment UI into the already-crowded Transfers screen.

Build a rough, reactable prototype (outline, wireframe, or stub UI/logic) of:

- The Scouting screen itself: how a manager sees their Scout count/availability, assigns a Scout to a
  Player (likely via a search/browse of players, echoing Transfers screen's Market browse), and views
  each active/paused assignment's Progress.
- How Attribute Range renders on the Transfers screen's player list/detail for an unscouted or
  partially-scouted player (a range display, distinct from the exact-number display own-squad/
  Fully-Scouted players get) — since ticket 03 will wire the real data, this only needs to react to
  "does this look/read right."

Use the actual settled shapes from tickets 01–03 (Scout count, Progress percentage, Attribute Range
bounds) as the data this prototype pretends to have.

Blocked by: 01-scout-resource-and-assignment-model, 02-progress-accrual-and-attribute-range,
03-technical-contract

## Prototype

Built on the throwaway `prototype/scouting-screen` branch (commit `38e5711`), not merged into
`latest_branch`. Mocked against the shapes settled in tickets 01-03; read-only, no RPC wiring.

Two new dev-only nav tabs on the existing career screen (gated on `NODE_ENV !== "production"`),
each with a floating bottom switcher (arrow keys or click to cycle):

- **"Scouting (Prototype)"** (`apps/desktop/src/renderer/prototype/ScoutingScreen.prototype.tsx`):
  three layouts for the new Scouting screen — **A** split panel (assignments left, browse/search
  right), **B** single unified table (every player, assign/unassign inline), **C** slot cards (one
  card per Scout, empty slots open a browse panel).
- **"Range (Prototype)"** (`apps/desktop/src/renderer/prototype/TransfersRange.prototype.tsx`):
  three ways to render Attribute Range / Transfer Value range on the Transfers screen's player
  list — **A** plain "low-high" text, **B** muted/italic styling on fogged cells, **C** a pill +
  band-width bar.

To view: check out `prototype/scouting-screen`, run `pnpm --filter @cm-clone/desktop dev`, create/
load a save, and use the two prototype tabs.

Awaiting human reaction (pick a variant per question, or note what to steal from each) before this
ticket can be marked resolved.
