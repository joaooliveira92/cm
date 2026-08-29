# 03-journeys-suite-coverage-and-gating

Type: grilling
Status: resolved

## Answer

**Journeys list** — all four candidates stay, covering the cross-screen surface smoke deliberately
skips (ticket 01): the non-deterministic *mutations*.

| Journey | Builds on | Assertion shape |
|---|---|---|
| Save persists across restarts | refactor of existing test (no seed) | structural: squad screen renders after reload |
| Tactics saved → carried into matchday live control | `before-matchday` seed | submit a live command, assert status text (deterministic surface) |
| Advance-calendar to season conclusion → SeasonSummary verdict | `before-season-end` seed | advance to `season_complete`, assert a verdict appears |
| Transfers bid lifecycle → budget reflects settled bid | `fresh` + `placeBid` | structural budget line + the bid's settled status |

**Gating:** all-CI, but in a separately-flagged file (e.g. `e2e/journeys.spec.ts` with a
`--grep`/describe tag) so the same smoke reliability config (retries: 2, timeout 30s, workers: 1)
applies and journeys can be toggled. Opt-in flag is a local-dev convenience only, never the CI gate.
Rationale: journeys run the slowest, least-deterministic surface (no sim seed), so they're the
highest flake risk — but dropping them to nightly-only would leave the exact-value asserts from
ticket 01 running only nightly, a slow red-morning feedback loop. All-CI-tagged keeps the
guarantees on every PR while isolating journeys for easy toggling.

## Caveat

The SeasonSummary verdict is fixed by the seed (ticket 02), so the advance-to-conclusion journey
can assert a verdict appears; it asserts no concrete position/scoreline.

## Question

Which cross-screen journeys belong in the separately-flagged journeys suite, and how is that suite
gated in CI?

Candidate journeys (each may lean on the seed helper from ticket 02):
- save persists across restarts (refactor of an existing test)
- tactics saved → carried into a matchday live control
- advance-calendar through to a season conclusion → SeasonSummary verdict
- transfers bid lifecycle → budget reflects a settled bid

Decide the journey list, their assertion shapes, and the gating contract: all-CI, nightly-only, or an
opt-in flag. This sharpens the "how reliable must slow journeys be" question in the map's fog.