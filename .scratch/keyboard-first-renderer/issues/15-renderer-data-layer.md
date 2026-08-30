Type: task
Status: ready-for-agent
Blocked by: None (can start immediately)

# 15: Renderer data layer — the RPC seam and Effect Atom

**What to build:** the renderer's data-fetching story replaced behind one public import seam
(`renderer/rpc`) that wraps the hand-rolled `window.cmClone.call` bridge: decode *both* wire
branches with the method schemas, expose a typed failure union (transport / contract-decode / typed
remote), mount one `RegistryProvider` at the active-career boundary keyed by save, and migrate every
career screen off the `useState`/`useEffect`/`reload()` triple onto Effect Atom families and
mutations. Ships the dependency-boundary lint rule that forbids direct preload/atom imports outside
the seam, and pins `effect` + `@effect/atom-react` at the exact rc in the workspace catalog.

**Decisions:**

- Seam: one public `renderer/rpc` import boundary; runtime at career boundary only; decode both success and failure; separate family identity from invalidation keys; save-level `["save", saveId]` key for calendar-wide invalidation; SWR for management reads, no SWR for match state; polling hand-rolled; no AtomRpc; pin `@effect/atom-react` at 4.0.0-rc.112; boundary enforcement over new Effect-lint rules. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-atom-adoption-shape.md).
- Yes — `@effect/atom-react@4.0.0-rc.112` matches the catalog pin exactly and the engine ships in core as `effect/unstable/reactivity`; the renderer data layer is Effect Atom, not TanStack Query. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-renderer-data-layer-effect-atom.md).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] AC-01: No career screen hand-rolls a fetch triple or a manual `reload()`; all RPC-backed reads go through the renderer RPC seam.
- [ ] AC-02: The seam decodes both wire branches with method schemas; transport, contract-decode, and typed remote failures are distinct variants.
- [ ] AC-03: Screens consume typed domain errors by pattern-matching the union, never string-matching `_tag`.
- [ ] AC-04: Family identity is the complete normalized request; reactivity keys describe invalidation domains and are not conflated.
- [ ] AC-05: Every save-scoped query subscribes to `["save", saveId]`; `advanceCalendar` invalidates only after success; mutations invalidate only what they change; no wildcards.
- [ ] AC-06: Management reads use SWR with visible refresh state; active match state never shows stale progress; no `refreshOnWindowFocus`.
- [ ] AC-07: Match polling and event reveal stay independently paced; dispose never abandons the durable started match.
- [ ] AC-08: Both Effect packages pinned at the exact rc in the workspace catalog; `pnpm install --frozen-lockfile` succeeds; typecheck passes.
- [ ] AC-09: Boundary lint rejects direct preload and atom imports from career screens; it ships with this stage, with a failing fixture in the rule.

## Comments

- Published from the approved to-tickets breakdown (spec: `.scratch/keyboard-first-renderer/spec.md`, Stage 1).