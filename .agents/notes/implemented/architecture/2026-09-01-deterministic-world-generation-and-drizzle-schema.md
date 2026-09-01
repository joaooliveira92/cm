# Agent Note: World generation is a pure function of a world seed, and Drizzle owns the save schema

Status: implemented

## Problem

World generation drew randomness from three uncontrolled places at once: `generateSquad` defaulted to
`Math.random`, every club, player and fixture took a fresh `randomUUID()`, and player ages were
measured against `new Date()`. Nothing about a generated world could be recovered. A bug report
naming a bad squad could not be reproduced; a fixture could not be pinned; the same save regenerated
after New Year produced different ages. This blocks the whole
[real-data spec](../../../../docs/research/real-data-spec.md), whose §2 makes seeded generation the
architectural principle everything else rests on.

Separately the save schema was ~230 lines of hand-written `CREATE TABLE` strings inside an Effect
generator, with no way to check that the DDL matched what the queries assumed.

## Decision

**A world is a pure function of `(worldSeed, generatorVersion, rulesetVersion, referenceYear).**
Those four values are written to a single-row `generation_manifest` table before any entity exists,
and `beginCareer` is the one place a world's entropy is drawn. Everything downstream — squads,
opening contracts, Season 1's fixture order and fixture ids — derives from the manifest rather than
drawing its own randomness.

**Seeds are derived, never shared.** `deriveSeed(parent, ...parts)` (FNV-1a, integer arithmetic
only, length-prefixed parts) gives each club a seed from the world seed and its canonical name, and
each player a seed from their club's seed and their squad slot. A single running stream would make
every entity's value depend on how many draws happened before it, so inserting one club would
regenerate the world after it. Derivation makes each entity independently addressable, which is what
`docs/research/real-data-spec.md`'s "changing one club does not regenerate every player" requires.

**Identity is derived alongside the data.** `deriveId` produces a UUID-shaped id from the same seed
path. Without this a world reproduces its *data* under fresh keys, and nothing that references a
player by id survives regeneration. Its four words come from four independently-based hashes of the
path rather than from one 32-bit seed expanded by the PRNG: an id expanded from a 32-bit seed carries
only 32 bits of entropy however long it looks, which across a world's ~500 players is roughly a
1-in-30,000 primary-key collision.

**There is no default `RandomSource`.** `generatePlayer` and `generateSquad` require the caller to
name the stream. A `Math.random` fallback lets a call site silently opt out of reproducibility, and
the failure is invisible until someone tries to regenerate.

**Ages are measured against an explicit `referenceYear`**, pinned per save, never the wall clock.

**Drizzle owns the save schema.** `apps/desktop/src/main/db/schema.ts` is the single source of truth;
`pnpm db:generate` runs drizzle-kit and compiles the SQL into `db/migrations.generated.ts`, which
`createSchema` executes through the existing Effect `SqlClient`. Drizzle owns the *schema*, not the
query layer — the ~2500 lines of raw `sql` template queries across season/transfers/match are
untouched.

## Alternatives considered

- **One RNG stream for the whole world.** Rejected: every entity's value then depends on the draw
  count before it, so no club is independently regenerable and any roster change reshuffles the world.
- **Keeping `randomUUID()` for identity.** Rejected: reproducibility up to a renaming is not
  reproducibility. Every foreign key in the save would point somewhere new.
- **Deriving ids by expanding a 32-bit seed through the PRNG** (the first cut here). Rejected once
  the entropy was counted: the id looks 128 bits wide but is not, and the collision surfaces as a
  primary-key failure partway through generating a world.
- **A crypto hash (`node:crypto`) for derivation.** Rejected: `@cm-clone/shared` and
  `@cm-clone/game-engine` are pure per
  [pure packages stay pure](../../proposed/architecture/2026-08-28-pure-packages-posture.md), and
  seed derivation needs no cryptographic property — only stability and spread.
- **Drizzle for the query layer too.** Rejected as far beyond this change: it would rewrite every
  query in the main process, and the Effect `SqlClient` seam is working.
- **Runtime DDL generation from Drizzle metadata**, or reading the `.sql` file at runtime. Rejected:
  the first reimplements drizzle-kit against a non-public API, the second is unreliable inside a
  packaged Electron app. Compiling the SQL to a TypeScript module keeps it a plain import and keeps
  the DDL reviewable in a diff.

## Consequences

- A save is reproducible from one integer. `beginCareer(dir, { worldSeed, referenceYear })`
  regenerates a known world exactly, ids included — which is what makes a generation bug reportable.
- The `CHECK` constraints are now generated from the Drizzle schema, and `db-schema.test.ts` fails if
  the generated DDL drifts from it. Editing `migrations.generated.ts` by hand is a mistake the gate
  catches.
- `SQUAD_SLOTS` makes squad demand a first-class value resolved before any player exists, which is
  the seam the spec's §6 squad-template work builds on.
- Any future generation step that draws its own randomness silently breaks reproducibility, and
  nothing mechanical catches it. New generation code must derive from the manifest.
- **Not covered:** `season.ts`'s AI-vs-AI fixture simulation still seeds from `Math.random` at play
  time. That is match simulation rather than world generation, and changing it touches the replay
  semantics recorded in
  [domain-bounded deciders and chunked resimulation](2026-08-27-domain-bounded-deciders-and-chunked-resimulation.md),
  so it was deliberately left alone.
- **Not covered:** there is no migration path for existing save files. `db:generate` regenerates a
  single `0000_schema.sql` rather than accumulating migrations, matching the current reality that
  saves are created fresh and never migrated in place.
