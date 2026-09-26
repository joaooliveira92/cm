# 15: e2e empty-load-list specs assert retired exact copy

**What to fix:** three specs assert the empty load list with
`getByText("No saves yet.", { exact: true })` — `apps/desktop/e2e/save-management.spec.ts:13` and
both AC-13 specs in `apps/desktop/e2e/router.spec.ts`. The rich-save-cards change (`d6bc3d32`,
2026-09-22) reworded the empty state into a single paragraph, "No saves yet. Start a new career to
begin managing." (`app/renderer/router/loadCareer.tsx`), so no element's full text equals "No saves
yet." and the three can never pass. The `exact` flag was meant to disambiguate an empty *list item*
from that paragraph, and the redesign removed both the item and the exact-matchable text.

What the three are proving is "the list stayed empty": leaving creation (with the discard
confirmation) leaks no provisional save into the load list. Retarget the assertion to the current
DOM — the empty-state paragraph by partial text, or the absence of any save card under the "Saved
careers" heading — keeping that intent. `saveEntry` was already retargeted to the rich cards in the
same `d6bc3d32` window (`e2e/launchApp.ts`), so the duplicates spec passes; only the empty-state
assertions are stale.

**Blocked by:** None

**Status:** resolved

- [x] The three specs pass again against the rich-save-cards DOM
- [x] Each still fails if a save does leak into the list