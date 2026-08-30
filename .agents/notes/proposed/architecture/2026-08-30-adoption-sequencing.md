# Agent Note: Adoption sequencing for the keyboard-first renderer

Status: proposed

## Problem

Ticket 13 is the last decision in the `keyboard-first-renderer` map, and the spec is the handoff
artifact — so the spec must sequence the work into stages that each leave the app working. Three
large changes are in flight at once (Atom data layer, TanStack Router, keyboard layer) and they touch
the same nine screens. Each earlier ticket locked its *shape* (08: one `renderer/rpc` seam with a
registry at the career boundary; 09: typed hash routes with the registry owned by the `/career/$saveId`
parent and navigation as typed Actions; 03: the Action registry, all-or-nothing per screen; 05/06:
the key map and focus coordinator; 07: palette + help; 10/11: grid and match-day keyboard; 12: e2e
conversion; 14: rebinding). What remained was *order* and *what the tree looks like at each stop*.

## Proposal

Seven stages, in this order. The "obvious" ordering — data layer, router, keyboard — survives, with
two refinements:

1. **The router lands before the keyboard spine, not after.** Ticket 09 makes navigation a typed
   `NavigateAction`; the Action model (ticket 03) dispatches navigation through that channel. An
   Action spine built before the router would have to dispatch navigation at a raw `setScreen`
   stub that the router stage then rewrites. The router also owns the Atom registry's home (the
   `/career/$saveId` parent), so data-layer work that mounts the registry must be prepared to
   relocate it — that relocation is exactly Stage 2.
2. **Discoverability is its own stage, and it is the one big-bang.** Ticket 03 forbids a palette
   that lies about available Actions, and ticket 07's palette lists global + current-screen actions.
   The palette can therefore only ship once *every* career screen dispatches registered Actions.
   The registry and key map can roll screen-by-screen; the palette, help overlay, and teaching
   splash are released together, after conversion completes.

### Stage sequence and done-criteria

| # | Stage | What lands | Done when |
|---|---|---|---|
| 1 | **Data layer** | `renderer/rpc` seam (decode both wire branches, typed `RpcClientError` union, atom families, invalidation map, SWR policy), `RegistryProvider` mounted at the active-career boundary, screen-by-screen migration off the `useState`/`useEffect`/`reload()` triple, and the dependency-boundary lint that forbids `cmClone.call` imports outside the seam | No screen hand-rolls a fetch triple or a manual `reload()`; screens import only `renderer/rpc`; boundary lint ships and passes; `pnpm check:all` green |
| 2 | **Router** | `createHashHistory` route tree (`/`, `/create/*`, `/career/$saveId/*`), `App.tsx` state machine dissolved, registry relocated into the career parent, navigation Actions (`NavigationDestination` union) with the resolver adapter, creation provisional session, semantic focus on route change | `App.tsx` holds no screen state; every stable view is a route; `App.tsx`'s four state variables (`loadedSave`, `screen`, `creating`, `creationState`) are gone, replaced by route + session; `g b` uses history; gate green |
| 3 | **Keyboard spine** | Action registry (per-screen, all-or-nothing), key map + `react-hotkeys-hook` behind its one-file seam, focus coordinator (roving, restoration, intent-aware), `:focus-visible` ring, Escape-layering | Every career screen dispatches registered Actions; key map bindings active across all seven career screens; prefix `g <key>` nav, `Enter` activation, text-input suppression work; gate green |
| 4 | **Discoverability** | Command palette (global + current-screen, disabled-with-reason), keyboard help overlay (All/Global/This screen tabs), inline key badges, one-shot teaching splash | Palette lists only currently-available Actions and is consistent with every screen's registry; help overlay enumerates bindings; gate green |
| 5 | **Level-3 upgrades** | TanStack Table for Squad, Market, Free Agents with row-roving + sortable headers + contextual Actions region; match-day live keyboard control (panel Escape, injury decisions, two-step substitution, tactics arrows); any remaining per-screen tier-3 interactions | The tier-3 screens from ticket 04 (MatchDay, Transfers, Tactics, Squad) are driveable with no mouse; gate green (+ e2e practice per stage 7) |
| 6 | **Rebinding** | `keybindings.json` under `userData` via new RPC methods, in-place help-overlay rebinding, per-Action reset and reset-all, collision validation | Overrides persist across restart and apply to all saves; locked keys reject; gate green |
| 7 | **e2e conversion** | Per ticket 12: level-3 journeys rewritten keyboard-first, `toBeFocused`/ARIA assertions, remaining specs stay clicks | Suite passes; e2e proves navigation, palette, Squad grid, substitution flow, Escape layering; existing click specs survive unchanged; gate + e2e green |

### Screen-by-screen, one big-bang

Within Stages 1, 2, 3, and 5, screens migrate one at a time; each landing leaves a working app. The
only intentional mixed intermediate state is a screen that is fully converted or fully untouched —
the Action model forbids the half-migrated palette-lie, and the data layer's all-or-nothing is per
screen because `reload()` is a shared misfit, not a per-screen truth.

### Gate compatibility notes

- **Renderer boundary lint ships in Stage 1.** The dependency rule stops new `cmClone.call` /
  `@effect/atom-react` / `effect/unstable/reactivity` imports outside `renderer/rpc`. Stage 1
  migration must not land it "later" — it is what makes the seam honest.
- **Typecheck during partial migration.** A screen converted to the seam and one still on the raw
  call coexist; nothing in `AppRpcs` changes, so the contract types are stable. The time `App.tsx`
  is being dissolved (Stage 2) is the only moment `pnpm check:all` could falter on dead code — the
  stage ends with the dead variables removed, not merely unused.
- **effect-lint.** No new renderer-specific semantic rule is added in the sequence (ticket 08 kept
  that posture); existing Effect lint applies by import. If Stage 3/5 review surfaces a recurring
  pattern, route it to `scripts/effect-lint.ts` per AGENTS.md.
- **e2e ordering.** The e2e stage intentionally comes last: it asserts the *finished* keyboard path,
  per ticket 12, and staging it earlier would chase a moving target. The click suite keeps running
  as regression until then.

### Room for deferred work

- **TanStack Form, Virtual, Pacer** remain deferred (map Out of scope): one form, largest list
  ~500 rows, MatchDay pacing is three constants. The sequence does not build the middleware they
  would slot into, so nothing here needs them.
- **Renderer-side lint rules** from the map's fog: an early-runner candidate is the
  `cmClone.call`-outside-seam import rule (Stage 1); a "no `Effect.runPromise` in renderer screens"
  rule stays deferred until an observed pattern justifies it.
- **User rebinding** is a full stage (6), not a fog item, per ticket 14.

### The Action model's claim on navigation

Ticket 03 said the Action registry owns navigation; ticket 09 made navigation a typed Action. The
sequence respects both: Stage 2 (router) precedes Stage 3 (spine), because the spine's navigation
Actions need the resolver adapter to exist. Nothing about the keyboard layer is postponed that
shares a stage with what it needs.

## Alternatives considered

- **Router first, then data.** Rejected: the router owns the Atom registry's parent mount, but the
  registry is data-layer infrastructure; routing before the seam exists forces placeholders and
  re-plumbing. Data-first deletes the most code (the `reload()` triple is the worst debt) and its
  migration is entirely additive — screens keep their internal wiring until swapped onto the seam.
- **Keyboard spine before router.** Rejected: navigation as a raw `setScreen` call would have to be
  re-routed the moment the router lands, so the spine's navigation Actions would be built twice.
- **Palette ships during Stage 3 screen-by-screen.** Rejected: it would either list half the
  actions (the ticket 03 lie) or force a full conversion *as a gate on a partial stage*, which is
  the same big-bang in worse clothing.
- **All nine screens converted at once at each stage.** Rejected: a working intermediate is the
  spec's promise, and per-screen conversion keeps each commit reviewable and each screen's
  regression local. The one acceptable mixed state is fully-converted-or-untouched.
- **e2e conversion during each stage.** Rejected: per ticket 12 the keyboard e2e asserts the
  finished path; authoring against a half-built keyboard path would encode the wrong behaviour.

## Acceptance criteria

- The spec (the map's handoff artifact) sequences exactly these seven stages with the done-criteria
  above, or a strict refinement of them argued against ticket 08–14.
- Stage 1 leaves `App.tsx` untouched by routing and no screen on a fetch triple.
- Stage 2 removes all four `App.tsx` state variables and relocates the registry into the career
  parent.
- Stages 3 and 4 never ship a palette that lists fewer Actions than the registry's current screen
  can dispatch.
- `pnpm check:all` is green at every stage boundary, including the typecheck that proves old dead
  state is removed, not unused.
- Renderer boundary lint ships in the Stage 1 commit, not later.
- The e2e stage is last and matches ticket 12's strategy.

## Risks

- **Stage drift.** A long sequence risks implementing stage N with stage N+1's assumptions (e.g.
  grid nav that presupposes routing). Mitigation: each stage's done-criteria are observable and the
  spec must list them per stage; a stage closes only on its own criteria.
- **The router's registry relocation.** Stage 1 "prepares to relocate" and Stage 2 must actually do
  it; if Stage 1 code hard-codes the registry into the old career render, Stage 2 carries a larger
  diff than planned. Mitigation: Stage 1 keeps the registry mount point a single component boundary,
  so relocation is moving one element.
- **Big-bang discoverability.** The palette/help land as one change, so a regression there shadows
  any screen. Mitigation: it is pure presentation over the registry; the e2e stage and the click
  suite both cover it.
- **Slipped "red ring" (gate as a formality).** Mixing stages is easy (rebinding into rebinding
  cleanup, e2e into discoverability). The spec's stage table is the guard; deviating from it in
  implementation is a spec change, reviewable as one.