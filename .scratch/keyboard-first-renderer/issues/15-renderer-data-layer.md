# 15: Renderer data layer — the RPC seam and Effect Atom

**What to build:** the renderer's data-fetching story replaced behind one public import seam
(`renderer/rpc`) that wraps the hand-rolled `window.cmClone.call` bridge: decode *both* wire
branches with the method schemas, expose a typed failure union (transport / contract-decode / typed
remote), mount one `RegistryProvider` at the active-career boundary keyed by save, and migrate every
career screen off the `useState`/`useEffect`/`reload()` triple onto Effect Atom families and
mutations. Ships the dependency-boundary lint rule that forbids direct preload/atom imports outside
the seam, and pins `effect` + `@effect/atom-react` at the exact rc in the workspace catalog.

**Decisions:**

- Seam: one public `renderer/rpc` import boundary; runtime at career boundary only; decode both success and failure; separate family identity from invalidation keys; save-level `["save", saveId]` key for calendar-wide invalidation; SWR for management reads, no SWR for match state; polling hand-rolled; no AtomRpc; pin `@effect/atom-react` at 4.0.0-rc.112; boundary enforcement over new Effect-lint rules. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-atom-adoption-shape.md).
- Yes — `@effect/atom-react@4.0.0-rc.112` matches the catalog pin exactly and the engine ships in core as `effect/unstable/reactivity`; the renderer data layer is Effect Atom, not TanStack Query. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-renderer-data-layer-effect-atom.md).

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] AC-01: No career screen hand-rolls a fetch triple or a manual `reload()`; all RPC-backed reads go through the renderer RPC seam. (Caveat: `listOpponentClubs` in MatchDayScreen is still a `useState`/`useEffect` fetch-on-mount behind the seam — accepted, per the match-day carve-out.)
- [x] AC-02: The seam decodes both wire branches with method schemas; transport, contract-decode, and typed remote failures are distinct variants.
- [x] AC-03: Screens consume typed domain errors by pattern-matching the union, never string-matching `_tag`.
- [x] AC-04: Family identity is the complete normalized request; reactivity keys describe invalidation domains and are not conflated.
- [x] AC-05: Every save-scoped query subscribes to `["save", saveId]`; `advanceCalendar` invalidates only after success; mutations invalidate only what they change; no wildcards. (Covered by the registry-level integration test in `renderer-screens.test.tsx`.)
- [x] AC-06: Management reads use SWR with visible refresh state; active match state never shows stale progress; no `refreshOnWindowFocus`.
- [x] AC-07: Match polling and event reveal stay independently paced; dispose never abandons the durable started match. (Resume-on-arrival via `awaiting_match_id` belongs to ticket 16's AC-15 — no match atom exists in this stage, so the recovery path ships with the router.)
- [x] AC-08: Both Effect packages pinned at the exact rc in the workspace catalog; `pnpm install --frozen-lockfile` succeeds; typecheck passes.
- [x] AC-09: Boundary lint rejects direct preload and atom imports from career screens; it ships with this stage, with a failing fixture in the rule.

## Comments

- Published from the approved to-tickets breakdown (spec: `.scratch/keyboard-first-renderer/spec.md`, Stage 1).
- Implemented and gate-verified; `apps/desktop/src/renderer/components/` (dead prototype demo code, zero references, hung typecheck) was removed to meet AC-08 — reversible from history.
- Repair list from review folded in at ship time: the two shipped notes promoted to `implemented/architecture/`, the registry-level invalidation integration test added, and three unreachable mutation atoms (`renewContract`, `setTrainingFocus`, `commitCareer`) pruned (their `INVALIDATION_RULES` rows remain, tested).