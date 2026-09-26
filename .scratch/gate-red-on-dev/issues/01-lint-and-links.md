# 01: Clear the 13 lint errors and the 18 broken markdown links

**What to do:** the two mechanical gates. No diagnosis required; these are unambiguous.

**Lint — 13 errors** (`npx oxlint .`, errors only; warnings are out of scope):

- `packages/contracts/src/rpc.ts:36` unused `CoachAssignmentView`
- `apps/desktop/src/main/season/queries.ts:2` `consistent-type-imports` on `CompetitionId`
- `apps/desktop/src/renderer/playerContract/PlayerContractScreen.tsx:3` unused `RpcClientError`
- `apps/desktop/src/renderer/playerProfile/PlayerProfileScreen.tsx:1,4` unused `PlayerProfileView`, `RpcClientError`
- `apps/desktop/src/renderer/matchHomeTeam/MatchHomeTeamScreen.tsx:22` unused param `side`
- `apps/desktop/src/renderer/matchPreview/MatchPreviewScreen.tsx:1` duplicate import of `../rpc.js`
- `apps/desktop/src/main/career/player.ts:99,99,120` three `no-explicit-any`
- `apps/desktop/test/main/transfers/budget-review.test.ts:40` unused `clubId`
- `apps/desktop/src/renderer/match/PostMatchSummary.tsx:75` unused `awayWonOnPenalties`
- `apps/desktop/src/renderer/match/MatchDayScreen.tsx:14` unused `state`

The three `no-explicit-any` are the only ones needing thought — ENGINEERING-CONTRACT bans `any` at
seams, so replace with a real type, not with a suppression. If a genuine type cannot be expressed,
say so rather than casting through `unknown` to silence it.

Two unused-variable cases deserve a look before deletion rather than a reflex removal:
`awayWonOnPenalties` and `state` may be a symptom of logic that was meant to use them. Check whether
the surrounding code has a bug before deleting the evidence of one.

**Links — 18 broken**, all under `.scratch/group-c-club-information/RECONCILIATION.md` and
`.scratch/group-d-player-and-staff-records/issues/02-staff-screens-scope.md`. Mostly wrong relative
depth (`../../../CONTEXT.md` from a file two levels down) and links to Agent Notes that have moved
between `proposed/` and `implemented/`. Fix the links to point at where the targets actually are; do
not delete a link to make the checker pass.

Acceptance:
- [x] `npx oxlint .` reports zero errors
- [x] `tsx scripts/verify-md-links.ts` passes
- [x] No suppression comments, no deleted links, no `any` traded for a cast
- [x] `pnpm -r typecheck` still clean

**Blocked by:** None

**Status:** resolved

## Answer

**Both gates clean.** `npx oxlint .` reports 0 errors (warnings, mostly `no-console` under
`.scratch/vendor-quarantine/` and `apps/desktop/tmp-probe/`, remain and are out of scope per the map).
`tsx scripts/verify-md-links.ts`: 1206 files checked, all links resolve. `pnpm -r typecheck` clean.

**The three `no-explicit-any` were removed without a replacement cast.** Two were
`r.position as any` / `r.familiarity as any` feeding `PlayerPositionView`; the row was typed
`{position: string; familiarity: string}` while the schema wants literal unions. Fixed by typing the
SQL row as `Schema.Schema.Type<typeof PositionSchema>` and `...FamiliarityTierSchema`, which puts the
assertion at the row boundary where the DB-trust claim belongs, and matches how sibling queries
already type rows with branded ids. The third, `statureTier: (...) as any`, was unnecessary outright —
the call is `Schema.decodeUnknownEffect`, whose input is `unknown`, so the cast was silencing nothing.

**The two suspicious unused variables were checked before deletion, and neither hid a bug.**
`awayWonOnPenalties` (`PostMatchSummary.tsx`) was redundant: the penalties block renders
`homeWonOnPenalties ? home : away`, so the away case was already covered. `state` in
`MatchDayScreen.tsx`'s `MatchOngoing` was a dead destructure — both children read the context
themselves.

**One dead prop removed rather than underscore-prefixed.** `TeamClubPanel` took `side` ("home" /
"away") and never read it. Removed from the type and both call sites. Worth a second opinion: nothing
now distinguishes the two panels for a screen-reader user beyond club name and DOM order, which is
probably sufficient but is a judgement call, not a fact.

**All 18 link failures were wrong relative depth, not missing targets.** Every target existed.
`.scratch/group-c-club-information/RECONCILIATION.md` sits two levels down, so repo root is `../..`,
but its links used `../../..`; and its "Group A/B ledger" links assumed the file lived under
`docs/specs/` alongside the other ledgers rather than under `.scratch/`. Also: group-d ticket 02
linked `issues/01-...` from inside `issues/`, and group-a's map cited the QuitGuard note under
`proposed/` after it was promoted to `implemented/`. No link was deleted to make the checker pass.
