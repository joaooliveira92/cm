# Decision Request: Should key-binding collisions validate across dispatch-priority tiers, not just the same scope?

Written when a stop condition fired during review of the keyboard-first-renderer effort (Stage 6,
ticket 21). Saved to `.scratch/keyboard-first-renderer/decision-request-binding-collision-tiers.md`.

A decision request is not a request for permission. It is a request for a **decision only a human can
make**: one that changes what the game is, not how it is built.

## Question

When a player rebinds an Action, should the collision check also catch a new binding that the
keyboard spine will **silently shadow** because a higher-priority tier owns the same keystroke —
rejecting it like the existing same-scope collision does — or is per-scope validation the intended
rule, accepting that some rebinds render in the help overlay but never fire?

## Why this is blocking

The Stage 6 validator (`apps/desktop/src/renderer/actions/overrides.ts`, `validateOverride`)
rejects a new binding that collides with another Action's effective binding **in the same scope
tier**, and rejects bindings whose *shape* the dispatcher could never express (e.g. a bare key on an
app-global Action). But the dispatch-priority model (keymap `priority.ts`, AC-17) disambiguates
across tiers: career-global bare keys resolve before screen keys, and the rank-5 career-global
`Continue` owns `Space` on every screen. Two reachable classes slip through:

1. Rebind a **career-global** Action (e.g. `continue`) to a key a **screen** Action uses (e.g.
   Transfers' `b`) → passes validation, permanently shadows `focus-bid`; the overlay shows two rows
   on `b`, one of which never fires.
2. Rebind a **screen** Action to `Space` → passes validation (same-scope), but rank-5
   `Continue` eats `Space` on every career screen, so the rebind never fires.

Both produce exactly the "silently dead shortcut" the same function rejects elsewhere and that the
AC-17 collision checks and `registry.ts` exist to prevent. The Agent Note's own text says "live in
the same scope," so the implementation is faithful to the written rule — the *rule* is the
ambiguity. This is a UX/design decision, not a bug I can safely guess: changing it now either
over-restricts legitimate deliberate re-claims (a player may want to move a global Action onto a key
a screen once used) or ships a dead-shortcut class.

## What is already settled

- Overrides are a layered `record<ActionId, binding>` over unchanged coded defaults; the registry is
  the single decision point (`overrides.ts`, `withEffectiveBindings`).
- Locked infra keys (`Escape`, `Primary+K`, `Primary+/`, `Enter`) reject rebinding in both
  directions; shape validation already rejects bindings the framework cannot express, including
  scope-mismatched shapes ("would never fire").
- The priority model is settled (AC-17, `keymap/priority.ts`): app-global Primary chords > overlay >
  career-global bare keys (incl. rank-5 `Continue`/`Space`) > screen scopes > prefix completions.
- The help overlay is the rebinding surface and shows effective bindings with a rebound marker; the
  palette lists "Rebind…".
- AC-35, as written, demands same-scope collisions be rejected naming the conflicting Action — that
  part always passes regardless of this answer.

## Options

### Option A — Extend collisions across higher-priority tiers

A new binding is rejected when a **higher-priority** tier already owns the same keystroke
(career-global effective bindings block screen targets; `Space` is owned by rank-5 `Continue` on
every screen). Lower-priority tiers never block (a screen Action's key re-claimed for a
career-global Action is a deliberate re-claim; the screen Action just isn't reachable on that key
anymore — but the overlay must keep showing it, and the player keeps the "Rebind…" path).

- **What the player experiences**: a rebind that would never fire is rejected up front with the
  conflicting Action named ("`b` is already in use by Continue"), instead of silently shipping a key
  that does nothing.
- **What it costs to build**: extend the blocked-set comparison in `validateOverride` to union in the
  effective bindings of higher-priority tiers (career-global for screen targets; the `Space` rule for
  anything below rank-5 Continue); a few tests.
- **What it forecloses**: can no longer deliberately move a career-global Action onto a key some
  screen uses, unless the screen Action's binding is reset first.
- **Save compatibility**: none (machine-local override file).

### Option B — Keep same-scope validation (status quo)

The current rule stands; cross-tier shadowing is accepted, and the overlay's two-rows-on-one-key is
the intended signal that the higher-priority tier wins.

- **What the player experiences**: some rebinds render in the overlay but never fire; the player
  notices from the two rows on one key and resets/chooses another key.
- **What it costs to build**: nothing.
- **What it forecloses**: the possibility of catching shadowed shortcuts at validation time; leans on
  overlay transparency instead.
- **Save compatibility**: none.

### Option C — Acknowledge-but-flag (A, minus hard rejection)

Validation passes, but the overlay marks a binding as "shadowed (overridden by `<Action>`)", giving
the player the information without blocking the write.

- **What the player experiences**: full transparency without refusing the write; the player decides.
- **What it costs to build**: a shadow-detection projection in the overlay (small).
- **What it forecloses**: nothing structural; a softer middle path between A and B.

## Recommendation

**Option A**, scoped to higher-priority tiers only. It matches the validator's own "would never
fire" principle for shapes, closes the dead-shortcut class the AC-17 machinery exists for, and the
cost is small and local to `overrides.ts`. Option C is a reasonable softer fallback if hard rejects
feel over-restrictive for deliberate re-claims; Option B ships today's behavior but leaves the
inconsistency with the shape checks standing.

## What is blocked, and what is not

- Blocked: nothing — AC-34/35/36 as written pass under every option (same-scope collisions and shape
  rejections are unconditional). This question tunes validation strictness for the tier-crossing
  cases the ACs do not name.
- Proceeding meanwhile: the shipping behavior is Option B until this is resolved; the help overlay
  already shows both effective bindings so no player is trapped. If a future ticket or e2e review
  flags dead rebinds, this request is the answer to route it to.