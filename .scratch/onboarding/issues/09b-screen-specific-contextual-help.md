# 09b: Screen-specific contextual help (Squad, Tactics, creation, boundary, Transfers)

**What to build:** Wire the registries from ticket 09a and the Term Disclosure pattern into each decision surface. Squad screen: inline Role Rating, Position, Condition; Attribute column headers from registries; empty state shows authoritative current state. Tactics screen: instruction descriptions from multiplier tables; Role Rating on slot selects. Creation: Pillar binding disclosure with resolver-derived timing. Pre-match boundary: readiness copy contract (unresolved state, blocked action, owning screen, normal-setup context); Irreversibility Disclosure for seed un-retryability. Transfers: Bid mechanics help (Influence's binding, seller response thresholds). No modals, no hover-only, no per-screen purpose blurbs, no modal help.

**Decisions:**

- Contextual help is a typed projection of the simulation model; it teaches the game's model rather than real football, never tapers, and is delivered through one keyboard-reachable Term Disclosure with decision-critical values kept inline. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-contextual-help-mechanical-provenance.md).

**Blocked by:** 07 (needs pre-match boundary for readiness copy + Irreversibility Disclosure), 09a (needs registries + Term Disclosure component)

**Status:** ready-for-agent

- [ ] Squad: inline Role Rating, Position, Condition; Attribute column headers from registries; empty state reports authoritative current state (never purpose blurbs)
- [ ] Tactics: instruction descriptions read from multiplier tables; Role Rating shown on slot selects; absent Tactic distinguished from saved one
- [ ] Creation: each Pillar's binding, modified dimension, and resolver-derived timing; no promised outcomes
- [ ] Pre-match boundary readiness copy: unresolved state in canonical vocabulary, blocked action (Play/Quick result unavailable), owning screen, normal-setup context; never failure styling
- [ ] Irreversibility Disclosure at boundary: starting freezes setup, leaving Match day resumes same match, Quick result runs same simulation; always available, never gated on seen-state
- [ ] Transfers: Bid mechanics grounded in `decideAiSellerResponse`; never mentions agents, wages, player persuasion, or promised squad roles
- [ ] No per-screen purpose blurbs ("Use this screen to manage your squad")
- [ ] All help non-modal, keyboard-reachable; no hover-only access paths
- [ ] Tests: readiness copy contract (typed blockers, never backend-authored sentences); help shows authoritative data