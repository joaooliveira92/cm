# 02: Continue exists once

**What to build:** The player has exactly one way to advance the Calendar. Today the League table
carries its own advance control — a second button, a second Action record, a second keyboard badge,
and a second in-flight state — beside the career chrome's Continue. Both dispatch the same command,
so which one the player used silently decides whether they are told that the advance failed.

Remove the League table's control and its Action record. The chrome's `continue` becomes the only
advance affordance in the career, as the career-loop note already ruled. The League table keeps
showing standings, season progress, and the effect of the last resolved Matchday; it stops being a
place time advances from.

Anything the removed record was carrying that the surviving one does not — its screen-scoped key
badge, its error line, the tests that drive the career loop through it — moves onto the chrome's
control or is deleted deliberately. Nothing about the surviving control's binding, label, or
disabled behaviour changes here.

Seam: renderer-only. No RPC method, payload, or failure changes.

**Decisions:**

- Continue moves out of the League table and into the shared shell: it must be visible from every
  primary management screen, consistently located, reachable by keyboard, and independent of the
  current route. Screen-bound Continue asserts that the League table owns time, which the domain
  does not say. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-continue-as-global-career-loop.md).
- Continue is expressed exactly once and renders from the `continue` Action record, never as a
  hardcoded second definition; the handler lives in the chrome so the binding and the button
  dispatch the same advance from every career screen. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-31-career-chrome-and-date-continue-bar.md).

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Exactly one Action record in the registry advances the Calendar.
- [x] The League table renders no advance control and registers no advance handler.
- [x] The career loop is reachable by pointer and by keyboard from every career screen, including
      the League table, through the chrome's control alone.
- [x] No screen displays a key badge for a removed Action.
- [x] Tests that exercised the advance through the League table now drive it through the chrome, or
      are deleted with a stated reason.
- [x] `pnpm check:all` is green.
