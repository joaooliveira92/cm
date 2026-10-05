# 21: club-staff-nav's two keyboard specs are deterministically red

Type: bug
Status: needs-triage

## What was measured

`e2e/club-staff-nav.spec.ts` fails its two keyboard tests in isolation, deterministically. Run:

```
pnpm --filter @cm-clone/desktop build
pnpm --filter @cm-clone/desktop exec playwright test e2e/club-staff-nav.spec.ts --reporter=line
```

Result: `1 passed, 2 failed`.

- **`g 7 r reaches Club Staff by keyboard with semantic focus` (line 42).** Navigation lands — the
  locator resolves to `<main data-focus-id="clubStaff" …>` — but its state is `inactive`, so
  `toBeFocused()` fails. The route reaches `staffOverview`, whose `StaffOverviewScreen` wraps
  `ClubStaffScreen` (own club); `navigateCareer` requests focus for the destination type
  `staffOverview`, while the rendered focus region is `clubStaff`.
- **`g b from Club Staff returns to the previous screen` (line 62).** After `pressPrefix(page, "b")`
  the Squad screen is not found: `getByText(/players$/)` resolves to nothing within 5s.

The third test ("the Club section's Staff entry opens the manager's own club staff roster") passes.

## Not a regression from the route-registry collapse

Reproduced on the parent commit `4827f564` (before `a679be93`, "declare every destination route
once") and again on `a679be93`: identical failures, 2 of 3. It is not the random full-run flake of
[17](17-desktop-e2e-fails-random-specs-in-full-runs.md) or
[18](18-two-unreproduced-e2e-failure-shapes.md) — it reproduces in a single-spec run.

## Direction

Not investigated past the location. The `staffOverview`/`clubStaff` focus-id split in test 1 is the
first thread: `StaffOverviewScreen` renders `ClubStaffScreen`, so two focus regions exist on one
route and the keyboard focus request names only the outer one. Test 2 is a separate back-history
question.

## Files

- `e2e/club-staff-nav.spec.ts`
- `src/renderer/staffOverview/StaffOverviewScreen.tsx`
- `src/renderer/clubStaff/ClubStaffScreen.tsx`
- `src/renderer/navigation/adapter.ts` (`navigateCareer` focus request)

**Blocked by:** none.