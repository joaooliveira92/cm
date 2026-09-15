# 02 — Scope decision for absent screens (98/102/104)

**What to build:** Decide whether the three absent screens are in scope for Group G:

- **98 Half-Time Team Talk**: Requires a morale/team-talk domain model that does not exist.
- **102 Post-Match Team Talk**: Same dependency as 98.
- **104 Match Incidents and Disciplinary Review**: Requires a disciplinary model. CONTEXT.md states disciplinary authority is "cut from v1."

**Blocked by:** 01 (inventory complete)

**Status:** resolved

## Answer

**104 (Disciplinary Review)** — Out of scope for Group G. CONTEXT.md explicitly states disciplinary authority is "cut from v1." Noted in spec as deferred.

**98/102 (Team Talks)** — Out of scope for Group G. Both require a morale/team-talk domain model that does not exist (per SPEC-ROADMAP.md: "Team Talks have no morale model to act on"). Building this is a separate effort beyond "building screens." Spec will note them as deferred infrastructure dependency.

Note-worthiness: Pure scoping call — no Agent Note warranted.