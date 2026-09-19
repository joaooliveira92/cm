# 22: The Quit dialog has no provisional-career variant

Split from [03 — Quit confirmation](03-quit-confirmation.md) on 2026-09-18. Ticket 03 shipped six of
its seven acceptance criteria and was closed on those; this is the seventh, which was never built and
would otherwise have been lost when 03 closed.

**What is missing.** `QuitGuard.tsx` has a single module constant —
`const QUIT_BODY = "Are you sure you want to close cm-clone?"` — and no branch for quitting mid
career-creation. Verified: the provisional copy ("Your incomplete career creation will be lost")
appears nowhere under `apps/`, there are no Continue / "Discard & Quit" buttons, and no
`discardCareer`-on-shutdown path exists.

So a player who quits partway through creating a career is told only that the app will close, and the
provisional world on disk is left behind without being named or cleaned up. The generic dialog is
strictly worse than no dialog here: it asks for confirmation of the wrong thing.

Acceptance:
- [ ] When a career is provisional (built but not committed), the Quit dialog says what is lost
- [ ] Its actions distinguish continuing from discarding, rather than offering one Quit
- [ ] Discarding removes the provisional world rather than orphaning it on disk
- [ ] A committed career still gets the existing generic dialog, unchanged
- [ ] A test covers both variants, and the provisional one asserts the discard actually happens

Note the adjacent precedent: `fdb9230` ("leaving a built world is confirmed, not assumed") already
solved the same problem for *navigating* away from a provisional career. This should reuse that
confirmation's shape and its discard path rather than inventing a second one.

**Blocked by:** None

**Status:** ready-for-agent
