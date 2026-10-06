# Validation Report: world-data-model

## Sprint (latest — ticket 02)

- Effort: `.scratch/world-data-model/`
- Tickets closed: `implementation/02-nations-and-cities-rows`
- Branch: `dev`
- Commits: pending (this report precedes the commit)

Prior sprint in this effort: `implementation/01-deterministic-background-match-seed`, commit `8070a62`.

## Acceptance criteria → evidence (ticket 02)

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | `nations` = canonical id (`nation_eng`) only, no activation/factual/profile/seed | `db-schema.test.ts` "keeps the world catalogue thin" (full-block match) + `world-determinism.test.ts` "writes the whole world catalogue" | PASS |
| 2 | `cities` = canonical id (`city_eng_london`), nation FK, name, band CHECK; no coords/figure/seed | `db-schema.test.ts` full-shape `cities` block | PASS |
| 3 | ≥1 city per nation; names plain data, never content-pack | `cities.test.ts` "curates at least one city for every nation" + module imports only `nations.js` | PASS |
| 4 | Catalogue written before clubs; identical rows across saves from one seed | `world-determinism.test.ts` two-seed/three-save `deepStrictEqual` test; insert order in `worldGeneration.ts` | PASS (framing deviation documented on ticket) |
| 5 | DDL regenerated; `verify-db-schema` passes | `pnpm db:generate` + `pnpm verify-db-schema` → "generated DDL matches db/schema.ts" | PASS |
| 6 | `pnpm check:all` green | see Gate | PASS |

## Gate (ticket 02)

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | PASS — `✓ typecheck (1390ms) · ✓ lint (409ms) · ✓ effect-lint (510ms) · ✓ verify-md-links (482ms) · ✓ verify-db-schema (830ms) · ✓ test (23331ms)` |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | not applicable — no screen changed |
| determinism | `cd apps/desktop && pnpm vitest run test/world-determinism.test.ts test/db-schema.test.ts` | run — 10/10 pass; catalogue rows identical across two seeds and two reference years |
| save compatibility | — | not applicable per contract — this is a new-schema addition (saves are created fresh); nothing reads the new tables yet, so old saves are unaffected |

## Prior sprint — ticket 01 (commit `8070a62`)

- Gate: `pnpm check:all` PASS — `✓ typecheck (1179ms) · ✓ lint (394ms) · ✓ effect-lint (515ms) · ✓ verify-md-links (494ms) · ✓ verify-db-schema (839ms) · ✓ test (23154ms)`.
- Determinism evidence: `pnpm vitest run test/season.test.ts --reporter=verbose` — 13/13 pass, including "two advances of the same save from the same starting state resolve every fixture identically" and "two saves generated from one world seed resolve identically after the same advances".
- Behavior change: background fixture seed derived from world seed + fixture identity (`Math.random()` removed from `apps/desktop/src/main`); watched fixture unchanged.
- Review: APPROVE, no blockers. One low finding (three stale Agent Note passages claiming the `Math.random()` defect) repaired in-commit.

## Review

- Ticket 02 reviewer verdict: **APPROVE**, no blocker, no high. Four optional hardenings — F1 (transaction-comment accuracy: sequence ≠ explicit transaction), F2 (exact-shape `cities` DDL assertion), F3 (`nations.ts` header no longer claims nations are the only real-world data), F4 (insert-order probe). F1–F3 applied. F4 attempted then reverted: SQLite rowids are per-table, so a cross-table insert-order probe is not possible without schema instrumentation; ordering is verified by inspection of `worldGeneration.ts` and the equality assertions. Recorded on the ticket.
- Framing deviation (AC4 "two different selections"): selection does not reach generation until ticket 03; the test pins the property with the save-varying inputs that exist (two reference years, two world seeds). Reviewer judged acceptable as shipped; handoff to ticket 03 recorded on the ticket.

## Decision records

- ADRs added: none.
- Agent Notes written: none.
- Agent Notes promoted: none — the linked notes (`world-catalogue-and-canonical-ids`, `results-only-geography-cost`) span later tickets (04/06 for `clubs.name` and competition names, 05 for `competitions`, 08 for `birth_city_id`).
- Agent Notes edited: none this sprint.

## Pre-existing failures / deferred

- jsdom `window.scrollTo` renderer noise in the test log: pre-existing, unrelated.
- The `nations.ts` "only real-world data" wording was a stale claim fixed as part of F3.
- Save-format note: older saves predating these two tables lack them; nothing reads them yet, so no breakage. The repo regenerates the `0000` initial schema rather than shipping ALTER migrations; whichever ticket first *reads* the catalogue inherits that pattern decision.