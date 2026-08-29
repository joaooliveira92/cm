# Domain skills

Skills that carry a specific technical domain, not a workflow. Each gets a gist-then-link line here; the source of truth is the skill's own `SKILL.md`.

| Skill | Purpose |
|---|---|
| [effect-code](../../.agents/skills/effect-code/SKILL.md) | Write Effect v4 code with its conventions: the `Effect<A, E, R>` type, constructors, running at the edge, `Effect.gen` vs pipelines, composition, control flow. Use when writing or reviewing code that uses the `effect` package. |
| [effect-v4-migration](../../.agents/skills/effect-v4-migration/SKILL.md) | Plan and drive an incremental (non-greedy) migration of a TypeScript codebase to Effect v4: quick-review the source against the v4 conventions, then chart the conversion as a map of seam tickets worked one per session. Use when migrating a codebase to Effect, or when a review should end in a sequenced migration plan instead of a big-bang rewrite. |

Knowledge base for both, distilled from the official v4 docs (`effect@rc`), all under `.agents/notes/`: `effect-v4-getting-started.md`, `effect-v4-error-management.md`, `effect-v4-requirements-management.md`, `effect-v4-resource-management.md`, `effect-v4-observability.md`, `effect-v4-state-management.md`, `effect-v4-code-style.md`, `effect-v4-data-types.md`, `effect-v4-concurrency.md`, `effect-v4-stream.md` (Stream + Sink), `effect-v4-configuration-runtime.md`, `effect-v4-scheduling.md`, `effect-v4-caching-batching.md`, `effect-v4-testing.md`. Not yet covered: Trait (Equal/Hash), Behaviour (Equivalence/Order), Platform (Node-specific), and the full Schema doc tree (a narrower Schema note already exists at `.agents/notes/agent-patterns/effect-schema.md`). The notes track the release-candidate API; pin the installed version when a migration charts.
