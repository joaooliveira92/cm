# 05-global-key-map

Type: prototype
Status: resolved
Blocked by: 01, 03, 04

## Question

What is the actual key map?

With the Action model settled and the screens tiered, design the concrete bindings a player learns.
Build a cheap, rough artifact to react to — a printed key map plus a throwaway screen wired to a
handful of real bindings is enough. Do not build the production layer.

Decide:

- **Screen navigation**: how a player reaches each of the nine screens. Prefix-style (`g` then a
  letter), direct single keys, numbered, or palette-only. Weigh against the fact that single keys
  are fastest but collide with everything, and that seven career screens plus creation flow is more
  than a comfortable single-key alphabet.
- **The primary action per screen**: advance calendar, place bid, make substitution, confirm tactic.
  Whether these share one "confirm" key contextualised per screen, or each gets its own binding.
- **Reserved global keys**: palette, help overlay, back/cancel, and whether Escape is universally
  "cancel current thing" — it cannot be, if it also closes the palette *and* backs out of a screen.
- **Modifier policy**: bare keys, or modifier-prefixed. Bare keys are faster and the app has few
  text fields, but they make the text-input collision problem sharper.
- **Text-input behaviour**: what happens to bindings while focus is in the save-name field or a bid
  amount input. This is currently in the map's fog; resolve it here or split it out.
- **Collision audit**: check the chosen map against the Electron and macOS keys the app cannot
  claim.

Link the prototype as an asset. Record the map itself in the answer — it is the artifact later
tickets read.

## Answer

**Prefix-style `g <key>` navigation with explicit registry bindings; `Enter` as focused-control activation (not screen-global primary); `Primary+K` palette, `Primary+/` help; mixed modifier policy with bare keys for screen-scoped actions and text-input suppression; creation is a separate scope with `g <key>` inactive.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-global-key-map.md). Prototype: [printed key map](../prototype/key-map.md) + [wired Transfers screen](../prototype/wired-transfers.html).