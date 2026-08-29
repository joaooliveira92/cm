# Map: e2e-coverage-wave-2

Label: wayfinder:map

> Status: charted. Decisions in progress. See [Destination](#destination) and the frontier.

## Destination

A **coverage spec extension** for the Playwright e2e suite of `@cm-clone/desktop`, covering the next wave of features the original map left untouched: free agent signing, incoming bid response, counter-offer flow, match day substitutions & force-off (structural), save management edge cases, and UI-reachable error paths. The deliverable is a spec extension (not the tests themselves) at `.scratch/e2e-coverage-wave-2/spec.md`, extending the canonical spec from the first wave. Reuses the existing seed-save machinery, reliability contract, and test infrastructure — no app changes.

## Notes

- Domain: Playwright + Electron e2e for the desktop app.
- **No app testability seams** (no deterministic sim seed, no test-only RPCs) — same constraint as wave 1.
- Reuses the wave 1 reliability contract: `retries: 2` CI-only, per-test `timeout: 30_000`, `workers: 1`, `fullyParallel: false`.
- Reuses the wave 1 seed-save helper pattern: in-process Effect-layered generator, no checked-in `.sqlite` fixtures.
- Same assertion philosophy: structural-only for smoke, exact-value only on seeded saves.
- Skills: writing-for-agents (for the spec), grilling + domain-modeling for the gating decisions.
- Say names, not bare ids.
- The wave 1 map (`.scratch/e2e-coverage/`) is closed; this is a fresh effort — do not reopen it.

## Decisions so far

- [UI-reachable error paths catalog](issues/05-ui-reachable-error-paths-catalog.md): Full catalog of 30+ UI-reachable error paths across 10 RPCs; `renewContract` and `setTrainingFocus` are dead code; generic failure messages dominate.

## Not yet specified

- **Match day force-off: structural-only vs try-to-trigger**: The map settled on structural-only for subs/force-off, but the exact assertion shape for the force-off prompt (orange injury dialogue, shorthanded banner) needs the match day structural ticket to resolve. For now, the fog includes "how to reliably reach the force-off UI state without a deterministic match seed."
- **Integration with wave 1 test suite structure**: Whether new tests go in the existing `app.spec.ts`/`journeys.spec.ts` or new files depends on the scale once the per-feature specs resolve. Not ticketable yet.

## Out of scope

- Contract renewal (no UI in the app — would need a UI addition, which is a separate product decision).
- Training focus (no UI in the app — same rationale).
- Manager sacking e2e (requires multi-season calendar advance; too slow and flaky for the reliability bar; unit tests in `sackedGuard.test.ts` cover the state machine).
- RPC-direct error-path tests (bypassing the UI to call RPCs with invalid params — unit tests cover this).
- Match day outcome-dependent assertions (scores, commentary — non-deterministic without a testability seam, which was ruled out).
- AI club logic as its own test (indirectly exercised by the bid-response seed; not a separate test target).