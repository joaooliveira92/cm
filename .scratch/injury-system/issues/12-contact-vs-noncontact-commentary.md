# 12: Contact vs non-contact commentary axis

**What to build:** injury commentary that distinguishes the two trigger paths, on top of the
existing light/medium/severe pools. A **contact** injury narrates structurally (broken toe, twisted
ankle, dead leg — "stretcher on for the ankle"); a **non-contact** injury narrates muscular/fatigue
(hamstring, calf, strain — "pulls up with a hamstring"). The severity axis (knock vs stretcher) stays
as-is; this adds the trigger axis so the feed reads differently for a bad tackle than for an
exhausted player running out of legs.

The engine already emits the `trigger` and `type` on every typed injury, and the commentary template
keying already supports per-pool selection; this ticket keys the injury commentary pools by
trigger × severity so the two paths narrate distinctly while staying non-repeating.

**Blocked by:** none (can start immediately).

**Status:** ready-for-agent

- [ ] Contact injury commentary uses structural body-part phrasing, distinct from non-contact
      muscular/fatigue phrasing, at every severity.
- [ ] Both axes remain non-repeating per the existing template rules (no back-to-back repeat of the
      same template within a pool).
- [ ] Commentary consumes the same typed injury events the engine emits (no separate representation).
- [ ] Shared tests cover a contact injury and a non-contact injury rendering different commentary for
      the same severity.