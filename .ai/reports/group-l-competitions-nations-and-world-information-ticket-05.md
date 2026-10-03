# Validation Report: group-l-competitions-nations-and-world-information, ticket 05

## Sprint

- Effort: `.scratch/group-l-competitions-nations-and-world-information/`
- Tickets closed: `05-competition-read-followups` (items 1 and 2, plus the optional low item)
- Filed: `06-competition-fixtures-deferred-surface` (`needs-info`),
  `decision-request-01-rpc-error-channel` (`needs-info`)
- Branch: `dev`, no feature branch
- Commit: see below

Generalises the fix `a3b82cf` made for one RPC: an RPC whose declared `error:` union is narrower than
what its handler can raise re-raises the error unencoded, and the renderer loses a typed error it
already knows how to describe.

## The audit (item 1)

The implementator did not eyeball this. It temporarily replaced `rpcServer.ts`'s
`Effect.Effect<unknown, unknown>` handler type with a method-indexed mapped type whose error channel
is `Schema.Schema.Type<(typeof AppRpcs)[M]["error"]> | Schema.SchemaError`, and read what `tsc`
rejected — a complete, exact answer for every method in `AppRpcs`, 66 diagnostics. The probe was
reverted; `git diff --stat apps/desktop/src/main/rpc/rpcServer.ts` is empty in the delivered tree,
which I verified directly.

**11 mismatches across 11 methods. 8 fixed, 3 classes deferred.**

| Method | Error added | Fixed |
|---|---|---|
| `getCompetitionTable` | `PendingFixtureIntegrityError` | yes (the ticket's own item) |
| `getManagerProfile`, `getManagerProfileScreen` | `ManagerProfileNotFoundError` | yes |
| `respondToBid`, `respondAsBidder` | `PendingFixtureIntegrityError`, `PlayerNotFoundError` | yes |
| `signFreeAgent`, `renewContract` | `PendingFixtureIntegrityError` | yes |
| `createSave` | `InvalidLeagueSelectionError`, `PresetFingerprintMismatchError`, `InvalidPillarDistributionError`, `ClubNotFoundError` | yes — **added after review** |

`ManagerProfileNotFoundError` was schema'd and raisable but named by no RPC union at all, so it could
never have crossed the boundary typed. Declaring it forced a `describeRpcError` case.

Deferred to `decision-request-01`, because the correct union is a design question:

- **`SqlError`** — in the error channel of roughly every save-scoped handler, declared by none.
  Verified: `grep -rn SqlError packages/contracts/src` returns zero hits.
- **Engine invariant errors** on `commitCareer`, `advanceCalendar`, `commitMatchday` and the
  remainder of `createSave` — main-process `Data.TaggedError`s with no contract schema.
- **Payload `SchemaError`** — a deliberate accepted position documented at `rpcServer.ts:489-491`,
  listed so the "left open" set is complete rather than selectively honest.

## Gate

| Gate | Baseline (clean `dev`, measured today) | After this change |
|---|---|---|
| typecheck | ✓ | ✓ |
| lint | ✗ | ✗ (unchanged) |
| effect-lint | ✓ | ✓ |
| verify-md-links | ✗ | ✗ (unchanged) |
| verify-db-schema | ✓ | ✓ |
| test | ✗ — 61 failed / 1895 passed | ✗ — 61 failed / 1906 passed |

`pnpm check:all`, run in full. Delta across both sprints today: **+0 failing**. The 61 failures are
the same pre-existing cluster in the same 15 files (`ReferenceError: window is not defined` at
`apps/desktop/src/renderer/navigation/scroll-state.ts:21`). `lint` and `verify-md-links` are red at
baseline for unrelated reasons; the implementator confirmed its one `oxlint` hit is present at `HEAD`
via `git stash`, and the broken-link list is byte-identical before and after.

The gate was re-run in full after the post-review `createSave` change rather than accepting the
earlier run plus a hand-run subset.

| Gate | Result |
|---|---|
| e2e | **not run.** `FixturesScreen` copy changed, so a screen changed. Not run for the same reason as ticket 04 (~10 min, drifts independently). A known omission, not a pass. |
| determinism | not applicable — no simulation, seeding or Player Development code touched |
| save compatibility | not applicable — widening an error union changes nothing on disk; no schema change, no migration |

## Mutation evidence

Every new test was observed failing against unfixed code, then restored. The strongest is end-to-end
rather than a schema roundtrip: reverting only `getCompetitionTable`'s union made
`CompetitionTableScreen.test.tsx` fail at
`findByText("This career's next fixture is inconsistent and cannot be opened.")`, because the
decode fails at the real `call.ts` and the screen falls to the generic line. No other code path
produces that sentence, so it cannot pass for the wrong reason.

Also observed: reverting all 7 unions → 9 of the 10 contract cases fail, each naming the narrower
union (the 10th, `getCompetitionTable` + `SaveNotFoundError`, correctly still passes); mutating each
screen's generic-failure copy → that test fails; reverting `FixturesScreen` to `-` → its test fails.

## Review findings and disposition

Reviewer verdict: **APPROVE** — no blocker, no high.

| Finding | Severity | Disposition |
|---|---|---|
| `createSave`'s deferral mis-classified — four of its undeclared errors are already schema'd with existing `describeRpcError` cases, so no design question attached | MEDIUM | **Fixed.** Declared them; corrected the ticket to record the entry as *mixed* rather than deferred. I verified both halves independently before changing it. |
| Two open design questions recorded only inside a ticket about to be resolved | LOW | **Fixed** — `decision-request-01` filed, and the ticket now points at it. |
| Ticket cited CONTEXT.md's **Schedule** _Avoid_ entry for `-` → `Unplayed`; neither screen ever said "Schedule" | NIT | **Fixed** — citation corrected to CONTEXT.md's own "unplayed Fixture" usage (448, 458, 797). The _Avoid_ entry is why *ticket 04* rejected "Scheduled"; it has no bearing here. |
| The untyped-`Failure` tests depend on `call.ts` having no envelope-shape guard | NIT | **Fixed** — both tests now name that coupling in a comment. |
| Audit's "left open" list omitted payload `SchemaError` | NIT | **Fixed** — listed. |

The review independently re-traced all seven widened unions to a raising statement and confirmed
none was widened with an unraisable error — including the negative case: `placeBid` correctly did
*not* receive `PendingFixtureIntegrityError`, since it returns `BidView` rather than the Transfers
screen. It also confirmed the blast radius: no consumer does an exhaustive `switch` over a single
method's error union, so widening cannot break a narrowing `===`.

## Should this be an effect-lint rule?

**No, and the reasoning is worth keeping.** AGENTS.md routes a repeat mechanical finding into
`scripts/effect-lint.ts`, but that script works on syntax and the fact needed here is a *type*:
"what can this Effect fail with, including errors raised by helpers it folds three levels down." Any
grep-shaped proxy would miss transitively-raised errors — exactly the class that shipped twice. The
failure mode would be false negatives, which is worse than no rule.

The check that does work is the probe itself, as a permanent type alias in `rpcServer.ts`: zero
runtime cost, no new script, fires inside the existing `typecheck` gate, and the Effect language
service names the missing error (`TS377003`). It is blocked today only by `SqlError`, which would
make ~50 handlers red. `decision-request-01` recommends adopting it with an infrastructure escape
hatch now and settling `SqlError` separately.

## Behavior changes

No player-visible change except intended ones: seven RPC paths that previously produced "The game
returned an unexpected response." now produce the specific sentence `describeRpcError` already held,
and an unplayed Fixture on `FixturesScreen` reads `Unplayed` instead of `-`. Both fixture screens
were checked against WCAG 1.4.1: neither conveys played/unplayed by colour alone — `FixturesScreen`
applies no state-dependent styling at all, and the other screen's muted italic is redundant with the
word.

## Decision records

- ADRs added: none
- Agent Notes written / promoted: none — no new structural decision shipped. The structural question
  this sprint *found* is in `decision-request-01`, which recommends a map rather than starting one.

## Known limitations

- e2e not run for a copy change on a reachable screen.
- `SqlError` remains undeclared across roughly every save-scoped handler — the largest instance of
  the very defect class this ticket addressed. Deferred deliberately, not overlooked.
- A `SqlError`'s `message` can carry the save's filesystem path across the boundary, which
  § Boundaries covers. Pre-existing and unrelated to this diff; routed with the same decision.
- Ticket 06 (deferred Competition Fixtures surface) and screens 164 and 161 await a human.
