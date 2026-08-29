# 03: Manager Profile, Pillar Distribution creation step, and five bindings

**What to build:** The `manager_profile` table (single-row, CHECK constraints for 1–5 bounds and sum-to-12) is written during `commitCareer`. A domain value object validates before persistence. The creation Step 1 UI offers four Archetype presets (Professor 5/1/2/4, Motivator 2/5/4/1, Sergeant 1/2/5/4, Academy Head 2/4/1/5) plus Custom mode with per-Pillar plus-minus controls. Points remaining display; submission enabled only at exactly 12. Each Pillar at 1 shows a contextual warning naming that pillar's actual consequences. Archetypes are mechanically identical to Custom with the same distribution.

The five bindings ship: Tactical Acumen → tactical instruction resolution (`tactical-modifiers.ts`); Influence → selling-club response (`decideAiSellerResponse`); Regimen → Condition lifecycle (`conditionDecayPerMinute`, `conditionAfterDays`) and injury severity (`resolveSeverity`); Technical Coaching → focused development (`TRAINING_FOCUS_MULTIPLIER` modifier in `developPlayer`). All four Pillars enter the engine as explicit parameters (no ambient manager state). `PersistedMatchStarted` carries the complete four-value distribution as a required field. Pillar explanations derive from actual resolver contributions, never from the Pillar value alone.

**Decisions:**

- Four Manager Pillars (Tactical Acumen, Influence, Regimen, Technical Coaching), each 1–5, sum to exactly 12; four curated Archetypes as examples not constraints; visible forever; plain immutable `manager_profile` row, not a Decider. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-manager-pillars-and-archetypes.md).
- Five Bindings on shipped systems only; Man-Management renamed to Influence; every other claimed effect cut except Scouting. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-manager-pillar-bindings-v1.md).
- `TRAINING_FOCUS_MULTIPLIER * technicalCoachingModifier(v) > 1.0` for every legal v. Regimen has no direct injury-occurrence modifier; higher Regimen never increases Condition decay or reduces recovery. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-manager-pillar-bindings-v1.md).
- Match-relevant Pillars enter the engine as explicit parameters; the engine reads no ambient manager state. `PersistedMatchStarted` carries the complete four-value Distribution. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-manager-pillar-bindings-v1.md).

**Blocked by:** 01b (rename completed), 02 (`commitCareer` exists)

**Status:** ready-for-agent

- [ ] `manager_profile` table exists with CHECK constraints (id=1, each pillar 1–5, sum = 12, archetype_origin in vocabulary)
- [ ] Domain value object validates before persistence
- [ ] Creation Step 1 UI: four Archetype presets, Custom mode with plus-minus, points remaining, submit enabled at exactly 12
- [ ] Pillar at 1 shows contextual warning naming actual consequences, never a generic "campaign may become unplayable"
- [ ] Each preset yields exactly the stated distribution; Custom entering the same numbers is mechanically identical
- [ ] Tactical Acumen → tactical instruction effectiveness via `tactical-modifiers.ts`
- [ ] Influence → seller response via `decideAiSellerResponse`, threshold/counter magnitude dimension, never rewrites Transfer Value
- [ ] Regimen → Condition decay/recovery rate + injury severity cutoff; no direct injury-occurrence modifier
- [ ] Technical Coaching → `TRAINING_FOCUS_MULTIPLIER` modifier; invariant: >1.0 at every legal v; Technical Coaching resolves at season conclusion per disclosure
- [ ] Pillars enter engine as explicit parameters; `PersistedMatchStarted` carries all four values
- [ ] Before Matchday 1, a seller response materially influenced by Influence is reachable (pre-season Transfer Window is open)
- [ ] No later than first-match completion, feedback attributable to Tactical Acumen is available
- [ ] No Manager Decider or `ManagerCreated` event introduced
- [ ] No Pillar Distribution assigned to AI managers
- [ ] CONTEXT.md carries entries for all four pillar names, distinguishing them from colliding existing terms
- [ ] Tests: each binding materially changes authoritative state; neutral at 3; bounded effects at 1 and 5; archetype-mechanical-identity; binding tests at the main-process career surface seam