# 12: `app.spec.ts` expects an `h1` on Squad, and the default view has none

**What to fix:** `app.spec.ts:20` ("Squad opens…") waits for `window.locator("h1")` and fails before
and after ticket 08, also when run alone. The page snapshot shows `main "Squad"` with only an
`h2 "Players (Position(s))"`. The only Squad `h1` is in `SquadTable.tsx`, which the default
position-list view does not render. It probably dates from the squad layout rework (`4470e3e`).

Triage first. Either the missing `h1` is an accessibility defect in the Squad screen (every other
screen owns its section `<h1>`, per the career chrome note), or the assertion is stale.

**Blocked by:** None

**Status:** resolved

- [x] Decided whether Squad should render an `h1`, and the screen or the spec is changed to match

## Comments

2026-09-16, triage, by the orchestrator: **an accessibility defect, not a stale assertion.** The
implemented [career chrome note](../../../.agents/notes/implemented/architecture/2026-08-31-career-chrome-and-date-continue-bar.md)
says each screen keeps its `<h1>`. About 40 screens do, and Squad does in its load-error state
(`SquadTable.tsx`). `4470e3e` removed it from the normal view on purpose, following
`.scratch/squad-instructions.md`, which says "Do not use a large standalone heading". A visually
hidden `<h1>Squad</h1>` satisfies both: screen readers get the section heading, and the layout gets
no standalone title.

## Answer

Resolved 2026-09-16. Squad renders a visually hidden `<h1>Squad</h1>` in its normal view
(`SquadTable.tsx`), in both the position list and the table. The layout still has no standalone
title. `squad-views.test.tsx` "names the screen with a level-one Squad heading in either layout" fails
with the heading removed and passes with it. `app.spec.ts` "Squad opens…" passes: all 7 tests in
`app.spec.ts` passed.
