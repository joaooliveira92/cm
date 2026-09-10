# 01 — The saved-game browser swallows save-repository failures

Type: bug-fix
Status: resolved

## Problem

> **Amended 2026-09-01.** The screen this ticket was written against was split. The entry point is now
> the Main Menu (`router/mainMenu.tsx`) and the saved-game browser moved to Load Career at `/load`
> (`router/loadCareer.tsx`). The `listSaves()` half below is now **done** on both screens: each
> distinguishes an unreachable repository from an empty one and offers `Retry`. What remains open is the
> Action-registry requirement under *Done when*, and the `loadSave` half, which the scope boundary below
> still rules out. The original problem statement is kept verbatim.

`LoadCareerScreen` discards every failure it can observe. In
[loadCareer.tsx](../../../apps/desktop/src/renderer/router/loadCareer.tsx):

```ts
const outcome = await Effect.runPromise(listSaves().pipe(Effect.result));
if (Result.isFailure(outcome)) return;   // refresh()
```

```ts
const outcome = await Effect.runPromise(loadSave(id).pipe(Effect.result));
if (Result.isFailure(outcome)) return;   // handleContinue()
```

A save repository that cannot be read is therefore indistinguishable from one that holds no saves:
the user sees "No saves yet." and an invitation to start a new career, on top of saves that exist and
are merely unreachable. Nothing is explained and nothing can be retried.

This was found by the Group A shell audit (spec 1 §10.1) and recorded as a `deferred` row anchored to
`unscheduled` in
[RECONCILIATION.md](../../../docs/specs/group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md).
It is cut as its own ticket because it is a defect rather than a spec deviation, and routing it
through the Group A spec assembly would delay a small fix behind a large document.

## Scope boundary — read this before changing `handleContinue`

The **stale-entry** half of this behaviour is deliberate and must not change here. The
[save management edge case note](../../../.agents/notes/implemented/testing/2026-08-28-save-management-edge-cases.md)
decided that clicking a save whose `.sqlite` file is gone leaves the user on the landing screen with
"no crash and no error banner", and `save-management.spec.ts` asserts exactly that.

So this ticket covers the **repository-wide** failure of `listSaves()`, which nothing has decided.
Changing the single-entry `loadSave()` behaviour means overturning an implemented note and its e2e
test, which is a separate decision and not in scope here.

## Done when

- A failed `listSaves()` is distinguishable from an empty repository in the UI: a concise explanation
  and a retry affordance, rather than an empty list.
- Retry is a registered Action, not a bare `onClick` — see the ticket below on the browser being
  outside the Action registry, and prefer landing both together if they are worked in one session.
- The existing empty-repository state ("No saves yet." plus Start New Career) is unchanged when
  `listSaves()` genuinely succeeds with zero rows.
- `save-management.spec.ts` still passes unchanged, proving the stale-entry contract above was not
  disturbed.
- A unit or component test covers the failed-`listSaves()` path, which today has none.

## Related

- Group A reconciliation ticket 09 owns the browser's missing keyboard tier. Its absent
  Exit/Preferences/Credits surface was settled by the 2026-09-01 Main Menu, which carries all three.
- Neither screen declares any Actions (`mainMenu` and `loadCareer` are legal action scopes with zero
  members), so the retry affordance is the first one either would gain.

## Comments

- Implemented 2026-09-09. The remaining open requirement — Retry as a registered Action, not a bare
  `onClick` — is shipped: `retry-save-list` is declared twice in `actions/allActions.ts` (scope
  `mainMenu` and scope `loadCareer`; one id across two scopes is the registry model's documented
  legal cross-scope record, ADR-0012 / action-model note), each screen registers the live handler on
  mount and unregisters on unmount via the `useEffect` cleanup, and both Retry buttons now dispatch
  through `data-action-id` + `dispatchAction`. The test bullet that said "covers the failed path,
  which today has none" was stale — the amendment shipped failure/empty-state coverage with the
  listSaves half; the new tests assert the Action registration and the retry-through-Action recovery.
  `handleContinue`/`loadSave()` and `e2e/save-management.spec.ts` are untouched; the stale-entry
  e2e spec passes 3/3.
- Reviewer: **APPROVE**. No blocker or high. Two LOW (registry-content assertion duplicated across
  the two specs; `hasActionHandler` inspects the same registration the effect performs) and two
  informational (bindingless actions surface in palette/help regardless of repository health,
  consistent with the retry precedent; the one-screen-mounted invariant is an assumption).
  Criterion "check:all green" carries the recorded repo-level caveat: the baseline is red before and
  after this diff, and the diff adds zero new failures (verified byte-identical canary on typecheck;
  the 4 failing test files and both Navbar errors are the documented baseline set).
