# 01-scaffold-disposition

Type: grilling
Status: open
Blocked by: 02

## Question

Keep-and-finish, or delete-and-redo, the uncommitted `apps/desktop/src/renderer/components/match-screen/`
scaffold as the answer to the [Retro Football Manager Match Screen brief](../references/brief.md)?

The choosing question, worked with the human who owns this working tree:

- **Provenance.** The entire tree is untracked (created today, 20:46–20:52). Where did it come from —
  a prior agent session, an external prototype, the user's own scratch? Was it an attempt at exactly
  this brief, or something else that happens to match it? A stale broken duplicate also sits at
  `components/` level (`MatchScreenDemo.tsx` + `mock-fixtures.ts` importing a nonexistent
  `MatchScreenStateSchema`), hinting a move/rename went wrong.
- **Quality verdict.** With ticket 02's gap inventory in hand: is the delta to brief compliance small
  enough that finishing in place is the sane route? Three candidate dispositions:
  - **a. Finish in place** — fix the gaps from 02, wire it up, add tests, commit.
  - **b. Rewrite presentation, keep the data model** — `types.ts` + formatters + fixture scenarios
    are close to the brief; rebuild the components/styles to fix structural gaps.
  - **c. Delete** — provenance or quality makes it a false start; build per the brief from scratch.
- **A genuine decision, not busywork.** If the user already knows (e.g. "that was an experiment,
  delete it"), say so and resolve fast; the audit in 02 is then context for a scoping call, not a
  build list.

Resolve with the human. Record the disposition and the reasoning, then link out to whatever 03 needs.

## Answer

(Resolved via grilling — findings from 02 inform the choice.)