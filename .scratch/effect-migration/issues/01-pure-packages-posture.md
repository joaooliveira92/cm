# 01: Posture for the pure packages (engine and shared)

## Question

`@cm-clone/game-engine` (17 files, dependency on `effect` present but zero imports) and
`@cm-clone/shared` (16 files, no effect dependency) are pure, synchronous, deterministic-from-seed
code with no IO and almost no expected failures. Decide the migration posture: convert them to
`Effect<A, E, R>` internals, or keep them pure and lift with `Effect.sync`/`Effect.try` only at the
desktop boundary. A third option is migrating the couple of invariant throws inside (e.g.
`tactical-modifiers.ts:19`) to `Effect.fail` with tagged errors while the rest stays plain.

The decision changes what every downstream ticket converts. Earlier notes say Effect is meant to be
picked up piecewise, and the repo's own ADRs document the engine as tactic-blind state machinery;
neither settles this. The answer should also say where the interior throw sites land: defects
(surviving as throws) or tagged failures.

Type: grilling
Blocked by: none (can start immediately)
Status: resolved

## Answer

**Keep engine/shared pure and lift at the desktop boundary; the tactical-modifiers throw stays a
defect; drop the unused `effect` dep.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-28-pure-packages-posture.md).