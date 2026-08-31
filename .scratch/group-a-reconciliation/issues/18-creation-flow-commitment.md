# 18 — Creation-flow commitment: Screens 11 & 12

Type: task
Status: open
Blocked by: 03

## Question

Screens 11 (Club Selection) and 12 (Manager Confirmation) share `createFlow.tsx` and the creation flow's `beginCareer`/`commitCareer` lifecycle. Both are partially implemented:

- **Screen 11** (`11_club_selection.md`, 56 sections, 1,795 lines): `ClubSelectionScreen.tsx` (64 lines) renders a read-only club list (20 clubs, Stature Tier, budgets, squad quality). **No selection affordance** — rows are not clickable, no radio/confirm. `createFlow.tsx` hard-codes `selectedClubId: ClubId.make("temp-club-id")`, so committing always fails.
- **Screen 12** (`12_manager_confirmation.md`, 61 sections, 1,696 lines): `ReviewPane` in `createFlow.tsx` (lines 296–321) shows a review (save name, manager name, archetype, 4 pillar values) and a real `Create Career` commit button. But the commit is **unreachable end-to-end** because it ships the placeholder club ID (Screen 11's defect).

E2E tests (`router.spec.ts` AC-13, `journeys.spec.ts`) exercise the failure-and-recover path.

This ticket performs a single `Reviewed` pass across both screens, registering rows for every section neither screen follows. The unreachable-commit defect is recorded as a `deferred` row and a follow-on defect ticket is cut separately — the audit registers, it does not fix.

The blanket-trim rows (ticket 03) are in the ledger. The incumbent/AI policy sections (§9, §28, §32, §33) survive the trim and have no implementation; they are registered as `deferred`.

## Done when

Both screens have a `Reviewed` status in `RECONCILIATION.md`, each with rows for every section the implementation does not follow, no `unscheduled` rows remain, and the unreachable-commit defect is recorded as a row with a follow-on ticket number.