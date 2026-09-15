# Agent Note: League and Nation Selection, and the end of the single fixed League

Status: implemented

## Decision

A career's **scope** is chosen by the player at creation, on a League and Nation Selection screen
that runs before anything is generated. The world is no longer one fixed 20-club League: the setup
catalogue offers regions, Nations, League Scope Options, and Competitions with dependency edges
between them, and the player selects which Nations take part and at what Simulation Mode.

This **overturns** the `League` term as `CONTEXT.md` previously stated it ("the single fixed set of
20 clubs a career is played within… no promotion, relegation, or multi-league structure") and the
three-step creation flow in [[2026-08-29-new-game-flow-sequence]]. Both documents are corrected
rather than left standing beside a contradicting implementation; the ledger row that recorded
Screen 3 as `contradicted` is replaced by rows describing what was and was not built.

Creation is now **four stages**: Leagues, Manager, Club, Review.

### What ships

- `packages/shared/src/leagueSetup.ts` — the catalogue, covering a four-tier pyramid with a reserve
  league, parallel regional divisions, a Nation with no playable league, a Nation present in metadata
  but unavailable, and cross-border tournaments whose dependencies span several Nations.

  > **Superseded in part.** This shipped as twelve *fictional* Nations across six invented regions.
  > The catalogue now carries real Nations, real ISO codes, and real confederations — see
  > [real geography with replaceable identities](../architecture/2026-09-01-real-geography-with-replaceable-identities.md).
  > Every structural shape above is preserved; only the names and the fingerprint changed.
- `packages/shared/src/leagueSelection.ts` — the pure decision layer: dependency closure with
  reference counting and cycle detection, the cost estimator, validation, search normalization,
  preset construction, and label sanitization.
- `apps/desktop/src/main/leagueSelection.ts` — the trusted application service: system capability,
  the sanitized read model, draft/preset/snapshot persistence, and submission.
- `apps/desktop/src/renderer/LeagueSelectionScreen.tsx` plus `leagueSelection/viewModel.ts` — the
  screen and its pure reducer.

### The separations that carry the design

**Intent and effective selection are two models, not one.** The player's intents are one record per
Nation — a mode and a League Scope Option. The effective selection is what those resolve to once
dependency closure runs. Everything the summary reports counts the *effective* selection, so a
Competition pulled in because something else needs it is visible in the totals and labelled as a
dependency rather than as a choice the player made and forgot.

**Resolution is server-side, and the renderer never resolves.** The screen sends a Nation id, a mode,
and a scope option id; main re-resolves against the catalogue on every call, including on submission.
A forged, stale, or replayed payload produces blocking issues rather than a career whose scope
nobody validated. This is why `resolveLeagueSelection` cannot fail: an invalid selection is a *value*
carrying issues, because the screen has to render exactly those issues.

**Staleness is guarded by an echoed revision, not by cancellation.** The IPC seam has no abort, so an
obsolete request is not cancelled — its answer is discarded. Every selection change bumps a monotonic
`selectionRevision`; `resolveLeagueSelection` echoes back the revision it was asked for; the reducer
accepts an answer only when the echo matches. The previous estimate stays on screen and is marked
stale in the meantime rather than blanking.

**Scope options, not tier numbers.** A pyramid is not always a linear chain — parallel regional
divisions, cross-border tournaments, and reserve leagues all break the "lowest division" model. The
player picks a supported scope option and the catalogue owns what that means, so the UI can never
assemble an invalid competition graph.

**Dependencies are simulated, never managed.** A Competition pulled in as a dependency is capped at
`background`: a playable selection needs its parent divisions and its national cup *running*, not
manageable. A Competition reached both ways keeps the stronger mode.

**Choosing scope does not create the world.** `Continue` produces one immutable
`LeagueSelectionSnapshot` and nothing else. World generation is gated on that snapshot existing,
which is a real change: generation used to start when the creation flow mounted.

## Consequences

- **`beginCareer` still generates the fixed 20-club League.** The snapshot records the scope the
  player chose and is carried through creation and shown on the Review step, but world generation
  does not yet read it. Screen 3 explicitly ends at the snapshot, and materializing a multi-Nation
  world is Screen 6's subject. This is the one place where the shipped behaviour is narrower than the
  vocabulary now suggests, and it is stated in `CONTEXT.md` rather than left to be discovered.
- **A lifecycle bug surfaced and was fixed.** Moving generation behind the snapshot exposed that the
  flow's teardown effect abandons the provisional world on a development double-invocation of mount
  effects, leaving the lifecycle in `Abandoned` — a state `canStartGeneration` refuses forever. It
  had been masked purely by ordering: generation used to start before that cleanup ran. A `reenter`
  transition re-arms an abandoned lifecycle on mount; it carries no save id, so it can never
  resurrect a world the abandonment already discarded.
- **`Escape`, `Ctrl+F`, and roving arrow traversal are unbound on this screen.** The tree exposes
  `treeitem` roles, expanded/selected/mixed state, and `Right`/`Left`/`Enter`/`Space` on a row, but
  the screen is absent from the tiering table in [[2026-08-29-screen-keyboard-tiers]] and declares no
  roving region. Native `Tab` order is what carries it today.
- **Setup state is machine-local and never enters a save.** Drafts, presets, and snapshots live in
  Electron `userData` beside `keybindings.json`, written through a temp-file rename so a process
  killed mid-write leaves either the old file or the new one. None of it reaches a migration.
- **Presets and drafts are fingerprint-bound and never migrated by guessing.** An entry naming a
  Nation or scope option the catalogue no longer contains is dropped and named; a fingerprint
  mismatch rejects the whole payload. Nothing is substituted because a name looks similar.

## Verification

`pnpm -r typecheck`, `oxlint`, `tsx scripts/effect-lint.ts`, and the suite. 139 tests cover this
work: 57 on the pure resolver, estimator, and validator; 29 on the view-model reducer; 31 on the
trusted service; 22 driving the shipped screen against the shipped service over a JSON round-trip.

The tests that carry the most weight are the ones about races rather than rendering: a stale answer
must not overwrite a newer one, an out-of-order pair must settle on the newest, a triple activation
of `Continue` must submit once, and a reordered-but-equivalent intent set must return the *same*
snapshot rather than minting a second.

## Coverage gaps

Deliberately unbuilt, and recorded as `deferred` rows in the Group A reconciliation ledger rather
than left silent: the advanced-details panel (§14), tree virtualization (§28), localized display
names (§26), responsive reflow and the summary-below-browser stacking (§27), the dependency viewer
and the removal-refusal dialog (§12.3, §12.4), preset migration reporting in the UI (§13.5), the
clear-selection confirmation (§13.2), start-date and population validation (§15.3, §15.4), mutually
exclusive competitions (§15.5), and live database-integrity revalidation (§15.7).
