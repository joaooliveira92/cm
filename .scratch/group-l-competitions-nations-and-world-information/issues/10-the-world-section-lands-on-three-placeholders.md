# 10: The World section's three entries all land on placeholders

Split out of [ticket 09](09-cull-the-group-l-placeholders.md) on 2026-09-20, which culled eighteen
`deferred` drill-downs and kept these three because they are **live nav destinations**, not
URL-only stubs.

## What is wrong

The World section offers Competitions, Nations and Clubs. All three render
`WIP — Placeholder screen`:

| Entry | Screen | What exists behind it |
|---|---|---|
| Competitions | `competitions/` | Every competition in the save, and **Screen 161 Competition Overview now exists** for each |
| Nations | `nations/` | `nations` and `cities` rows exist; every Group L nation *screen* is `deferred` |
| Clubs | `clubs/` | Every club, and Screens 34, 38, 39, 40 and 42 all exist per club |

This is the same defect group-c ticket 02 fixed for Club → Staff, three times over: a nav entry
promising a screen while a real one sits a route away.

## Competitions is the urgent one

[Ticket 08](08-competition-overview.md) built Screen 161 as the competition branch's landing page,
and it links to Table, Fixtures and Results. **Nothing links to it.** Until this entry lists the
save's competitions, that whole branch — four screens, three of them shipped weeks ago — is
reachable only by typing a URL.

Clubs is the same shape and nearly as strong: five club screens exist and the only way into any of
them is a league-table row, which reaches only the clubs in the manager's own division.

**Nations is the weak one, and may not be worth building.** Every nation screen Group L charted is
`deferred` — overview, competitions, clubs, fixtures, history, players, squads, staff — so a Nations
list would link to nothing. Ruling it removed, with its nav entry, is a legitimate answer and
probably the right one; say which and why rather than building a list of dead ends.

## What each list owes

A row per entity, named through the content pack, linking to the screen that exists for it. Nothing
more: these are browse lists, not dashboards, and neither has a model of its own to show.

Read the [ledger](../../../docs/specs/group_l_competitions_nations_and_world_information/RECONCILIATION.md)
before adding a column. Competition statistics, records and history are all `deferred`, and a browse
list is exactly where a stray "titles won" column would look harmless.

## Acceptance

- [x] World → Competitions lists the save's competitions, each reaching its Overview (Screen 161)
- [~] World → Clubs — **removed instead**, with its nav entry. See the ruling below.
- [x] Nations is either built or removed with its nav entry, and the ledger records which and why
- [x] No column sourced from a model the ledger says does not exist
- [x] `grep -rl "WIP" apps/desktop/src/renderer --include "*.tsx"` returns no `competition*` or
      `nation*` screen, and no `clubs/`
- [x] An e2e spec reaches Screen 161 **through the navbar**, retiring the by-address entry the
      competition specs currently use
- [x] `pnpm check:all` green and `pnpm --filter @cm-clone/desktop test:e2e` green

**Blocked by:** None.

**Status:** resolved

## Answer

**One built, two removed.** The World section now has a single entry, Competitions, and it is the
only part of the world with screens behind it. `pnpm check:all` green, **e2e 55 passed**.

### Competitions: built, and it unblocks four screens

`CompetitionsScreen` lists every competition in the save — name, nation, kind, tier, club count —
each row opening that competition's Overview. `getCompetitions` is a new read over `competitions`
and its nation, ordered nation → tier → id so the list reads as the world is shaped and a cup sorts
after the ladder rather than above it.

**This is what makes the competition branch reachable.** Screens 161–164 all shipped with no entry
point; the e2e spec now walks World → Competitions → a row → Overview → Table, Fixtures, Results
with **nothing addressed by URL**, retiring the by-address entry the earlier competition specs used.
That is the only way to notice an entry point breaking again.

No standings, no honours, no "titles won". A browse list is exactly where such a column looks
harmless, and every screen that would source one is `deferred`. A test asserts each is absent.

### Clubs: removed, and this is a first-time ruling

The ticket expected it built. Against the evidence, removal is the better answer:

- **Nothing specifies it.** No Group L import screen asks for an all-clubs browse.
- **It is unbounded.** The default scope is twenty clubs; a full pyramid is sixteen thousand. A flat
  list needs search, filter and pagination, none of which exists — and Player Search (Screen 119),
  the one screen that would establish that machinery, is itself deferred behind a decision request.
- **The structured path already works.** A club is reached through a competition's table, which now
  has a way in. That is one click further than a flat list and bounded at every step.

It can come back the moment a Club Search is specified; the ledger row says so. Recorded rather than
deleted silently, because "we removed a navbar entry" is exactly the kind of thing a future reader
will otherwise assume was an accident.

### Nations: removed, as the ticket predicted

Every nation screen Group L charted is `deferred` — overview, competitions, clubs, fixtures,
history, players, squads, staff. A Nations list would have linked to nothing but dead ends, which is
a worse lie than the placeholder it replaced.

### The World section with one item

That is the honest shape right now, not a defect. It grows back when Groups O, P and Q build the
nation and world screens they own.

### The 600-line ceiling fired, and splitting beat exempting

Adding these handlers took `main/rpc/rpcServer.ts` to **602 lines**, and both `effect-lint` and
`max-file-length-lint.test.ts` went red — the guard the main-process-decomposition effort built,
working exactly as intended.

The tempting answer was an exemption: `packages/contracts/src/rpc.ts` already has one reading *"RPC
method registry; grows linearly with endpoints"*, and `rpcServer.ts` is that registry's other half.
Rejected, because the contracts file is pure declaration while this one is 440 lines of
implementation, and implementations group.

Split along a real seam into `rpc/browseHandlers.ts`: the eight read-only surfaces reached **with a
target in hand** — a club or a competition — as against the save-scoped screens the manager
navigates to directly. They arrived together over group-c tickets 06–08 and group-l 07–10, and they
change together. `rpcServer.ts` spreads the partial map in and still types the whole against
`{ [M in AppRpcMethod]: Handler<M> }`, so a missing method is a compile error in the same place it
always was.

602 → 548 lines, and the next competition surface has somewhere obvious to go.
