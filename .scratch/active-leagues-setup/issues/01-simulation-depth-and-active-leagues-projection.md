# 01: Simulation Depth and the active-leagues projection

**What to build:** a player on the reworked step 1 sees one stable row per active competition in their career scope, each carrying its own simulation depth at the three-tier grain the screen is built around — **full**, **standard**, and **results-only** — alongside the league's identity and a scope description. The slice sets up the model that every later ticket renders, per the Active Leagues Setup spec's "Simulation Depth is a new domain term" and "per-competition grain rides the Nation + scope-option safety rail" decisions: it does not invent a UI.

The projection turns the trusted resolved selection the seam already returns into the row model: one entry per active competition with a stable league id; the effective depth computed per row — a league pulled in as a dependency is capped at `standard` and is not depth-editable, shown as its effective value rather than as an editable override; a row that must change its Nation's scope to change depth keeps both in view. Duplicate prevention and the at-least-one-active-league rule live in this domain layer, so no later ticket can assemble an invalid list.

The slice's edge promise: pure, with no I/O — it rides the existing resolved-selection response, so no new RPC method exists yet. Failures are checked values, not throws: an unknown league or an empty scope is a validation result the screen renders, never a defect. Callers observe the row model and the validity/duplicate outcomes below.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A `SimulationDepth` term exists with the three CM Clone-native values (full / standard / results-only), each mapping onto the established mode ladder (playable / background / view_only), while `SimulationMode` keeps its per-Nation meaning including its not-loaded value; the two readings stay distinct in the shared vocabulary.
- [ ] A projection derives one row per active competition from the resolved selection, with a stable league id (never the array index), a scope description, and the effective depth — a dependency-capped competition reads `standard` and is not depth-editable, per the spec's no-free-form-assembly and capped-dependency rule.
- [ ] Duplicate league selections are prevented by the domain, and an empty scope (zero active leagues) is a validation result rather than a thrown error.
- [ ] Pure unit tests cover depth mapping, the projection row model, duplicate prevention, the at-least-one rule, and the empty-invalid setup, with deterministic fixtures; contracts round-trip stays green for the resolved-selection value the projection reads.
- [ ] `pnpm check:all` is green at this commit.