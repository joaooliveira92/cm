# Agent Note: Every test world is seeded

Status: implemented

## Problem

`createSave` is the shim nearly every desktop spec builds a world on. It forwarded neither of
`beginCareer`'s deterministic inputs, so the world seed fell through to `Random.nextIntBetween` and
the reference year to the system clock. **Every spec played a different world on every run.**

The suite therefore had no fixed input, and the contract's determinism rule — identical save state,
inputs and seed produce identical outcomes — could not be applied to it at all. A defect reachable
on a fraction of worlds does not present as a defect under those conditions. It presents as a flake:
same error, same source line, a different spec each run, green in isolation, green on re-run.

That is precisely what gate-red-on-dev ticket 05 chased for two sprints. The hypothesis in the
ticket was shared mutable state between specs. There was none. Measured over 400 explicit worlds,
0.75% of them leave the human club unable to field eleven after one season of contract expiries,
which is enough to redden roughly one full suite run in three.

## Decision

Test worlds are pinned; production worlds are not.

- `createSave` takes an optional fourth argument forwarding `worldSeed` and `referenceYear`.
  Omitting it is the old behaviour, and the RPC handler omits it: a career the player starts *should*
  get a world nobody chose.
- `apps/desktop/test/seeded-save.ts` re-exports `createSave` with both pinned. Specs import
  `createSave` from there. Nothing at the call sites changed — only the import — so the change is
  36 import lines and no test logic.
- A spec that needs a *particular* world passes its own seed. `contract-expiry.test.ts` pins the one
  where the human club falls to ten.

The corollary, and the part worth keeping: **a test helper that cannot establish its precondition
must say so.** `readyPendingFixture` used to leave a club it could not make ready alone and hand the
Fixture on regardless, so the failure surfaced from `match/start.ts` as a readiness error about a
state that module had no part in creating. It now raises `HumanClubCannotFieldElevenError` carrying
the squad size. The diagnosis cost of the old behaviour was most of a sprint.

## Alternatives considered

- **Provide a seeded `Random` service to the whole suite.** Reaches every unseeded draw at once
  rather than only `createSave`'s, which is more thorough. Rejected for now: Effect services are
  provided per-effect, and `it.effect` gives no single place to do it without touching every spec —
  more churn than the import swap, for a generality nothing currently needs.
- **Default the seed inside `createSave`.** One line, no test changes. Rejected: it makes production
  careers deterministic, which is a game defect, to fix a test problem.
- **A distinct seed per spec, derived from the save name.** Keeps incidental world variety.
  Rejected: variety by accident is the defect. A spec that wants a second world should name it.
- **Accept the flake and retry.** Rejected explicitly — a gate that fails once in a while is on its
  way back to being ignored, which is the whole premise of the gate-red-on-dev effort.

## Consequences

- The suite plays one world. Coverage that came from random worlds is gone — it was never coverage,
  because a failure it found was unreproducible and read as noise. Where world variety is genuinely
  wanted, it belongs in a spec that names its seeds.
- `TEST_REFERENCE_YEAR` is pinned to 2026, matching what the clock gave when this shipped. The
  suite no longer regenerates every player's age on 1 January.
- Squad decay past season 2 is now a visible, filed question rather than an intermittent red:
  see `.scratch/gate-red-on-dev/decision-request-01-squad-decay-has-no-floor.md`.
