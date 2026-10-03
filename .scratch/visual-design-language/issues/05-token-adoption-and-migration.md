# 05 — Token adoption mechanism and migration strategy

Type: grilling
Status: resolved

## Question

How are the adopted design tokens physically plumbed into the renderer, and how do
~391 hardcoded `slate-*` call sites move onto them incrementally?

## Why this exists

The visual frame was adopted on 2026-08-29 and has not been built. `index.css` is
still a single `@import "tailwindcss";` line, there is no `:root` block, and the
renderer has since grown *more* flat-slate styling, not less. The decision did not
fail because it was wrong; it failed because nothing said how to apply it to a tree
that was already styled. This ticket owes the spec that answer.

## Decide: mechanism

1. **Tailwind 4 `@theme` versus a raw `:root` block versus both.** Tailwind 4's
   `@theme` generates utilities from token definitions, which keeps the codebase's
   existing utility-class idiom. A raw `:root` block is runtime-switchable, which a
   skin system would need but nothing today does. Picking one shapes whether the
   deferred skin system is cheap or expensive later — say so explicitly rather than
   leaving it implied.
2. **Semantic names versus literal names.** `--panel-bg` versus `--chrome-blue-mid`.
   The recorded token table mixes both.
3. **Where the tokens live** — `index.css`, a dedicated stylesheet, or a Tailwind
   preset — and how a component is expected to consume one.
4. Whether any component-level abstraction (a `Panel`, a `Button`) is introduced, or
   whether every screen keeps composing utilities directly.

## Decide: migration strategy

5. **Sequencing.** Candidate strategies: primitives-first (retheme `DataTable`,
   `TablePanel`, `LightweightDialog`, `CareerChrome` and let screens inherit),
   screen-by-screen, or alias-first (redefine what `slate-*` resolves to and repaint
   in place). Recommend one and say why the others lose.
6. **The mixed-state period.** A partial migration means two visual languages on
   screen simultaneously. Is that acceptable, or must adoption be atomic per screen?
7. **Preventing regression.** New screens keep arriving. What stops the next one from
   adding fresh `slate-*` classes — a lint rule in `scripts/effect-lint.ts`, a
   convention line in a skill, or nothing?

## Output

The adoption half of the spec: the token plumbing, the migration sequence, and the
guard that keeps flat slate from spreading while the migration is in flight.

## Answer

**`@theme` (non-inline) in `index.css` emitting role-named `--color-*` utilities; constants not components; alias-first global repaint then shared-layer-first renames; `no-slate-class-name` lint rule as the guard.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-31-token-adoption-and-migration.md).
