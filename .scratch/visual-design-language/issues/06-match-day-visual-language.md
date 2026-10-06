# 06 — Match-day visual language

Type: grilling
Status: resolved
Blocked by: 04, 05

## Question

Does the match-day screen adopt the career token system, or carve its own lane?

## Why this exists

Match-day visuals were originally ruled out of this map because the
`retro-match-screen` effort owned them. That effort was archived on 2026-08-30 and
its prototype directory deleted in the same commit, so `MatchDayScreen.tsx` is now a
live screen using the same flat slate as everything else, with no owner. This is the
one screen the chrome-blue language was originally designed *for*, so leaving it
unowned is the worst of the available options.

## Context

The deleted prototype at `apps/desktop/src/renderer/components/match-screen/` is recoverable at commit
`6d6ba56^` (removed by the 2026-08-30 RPC-seam commit; `590434c` is the unrelated
`.scratch/` archive). Its `styles.css` was ~967 lines and defined the chrome-blue gradients,
panel-dark surfaces, `#fff400` highlight, Trebuchet MS stack, and a beveled button
system — every token the visual frame decision later adopted. Read it there. It also
contained a sidebar with Prev/Next, a Continue Game button, and nav items, which is a
second, competing answer to the navigation question in
[Navigation frame and Continue/date bar](04-navigation-frame-and-continue-bar.md).

## Decide

1. Does match day render in the same chrome as every other career screen, or does it
   get a distinct full-bleed presentation (stadium backdrop, scoreboard, overlay
   panels) the way the prototype assumed?
2. If distinct: which tokens are shared with the career system and which are
   match-only, so the two do not drift into unrelated palettes.
3. What, if anything, is salvaged from the deleted prototype — tokens, layout,
   component code, or nothing but the reference screenshots.
4. How the in-match Continue affordance relates to the career Continue bar decided in
   ticket 04. They are the same verb in two contexts, or two different verbs.
5. Whether the commentary feed, incident markers, and the scoreboard need visual
   patterns that no other screen needs, and therefore belong in this ticket rather
   than in the general layout grammar.

## Blocked by

Ticket 04 settles the Continue affordance and the chrome treatment this screen either
shares or deliberately departs from. Ticket 05 settles how a token is expressed, which
this ticket needs before it can say "match-only token".

## Answer

**Match day renders inside the career chrome on the shared token system; the only match-only element is the scoreboard surface; the stadium is a CSS-only wash (image deferred under the overlay); a neutral chrome-band scoreboard; the chrome's cluster shows the match readout during a live match and returns to the season readout + Continue at full time; the feed keeps a minute gutter and incident colors from the shared status tokens; possession/incidents/fixture panels are deferred on engine data; no prototype component code salvaged.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-31-match-day-visual-language.md).
