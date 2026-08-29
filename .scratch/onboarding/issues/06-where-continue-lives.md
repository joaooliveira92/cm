# Where the Continue command lives

Type: grilling
Status: resolved
Blocked by: 05

## Question

The seed doc calls understanding the Continue loop "the most important onboarding milestone": read
messages, follow links, decide, adjust, press Continue, respond to the next event.

Ours is `advanceCalendar`, and it is a button on the **League table screen**
(`apps/desktop/src/renderer/LeagueTableScreen.tsx`) — the game's primary rhythm control is on a
secondary screen, reachable only by first navigating somewhere unrelated.

Open questions:

- Does Continue become a **persistent control** visible from every screen (a nav-bar affordance
  alongside the existing tabs), or stay screen-bound?
- What does Continue **stop for**? Today `advanceCalendar` returns an `AdvanceCalendarResult`.
  03/04's Continue halted on a new message, a decision, an approaching match, a transfer response, or
  an injury. Which of our events are interrupt-worthy, and which pass silently? This is coupled to
  ticket 05: if there is an inbox, "an unread message exists" is the natural stop condition; if not,
  each interrupt needs its own answer.
- Is there a **keyboard binding**? The doc notes the space bar both continued the game and stepped
  through unread news. Function-key shortcuts to each screen are a related but separable idea.
- What does Continue do when the manager has **not done something required** — no legal starting XI,
  an unfilled squad? Block with an explanation, or advance and let the consequence land? The doc's
  "not protected from failure" stance argues for the latter; section 13's "poor explanation of
  consequences" argues for at least telling them.
- Does the label stay "Continue", matching the genre convention the doc describes?

## Constraints from ticket 05

There is no inbox, so **"an unread message exists" is not available as a stop condition.** Each
interrupt needs its own answer, and the candidate set is the fields `advanceCalendar` already returns
on `AdvanceCalendarResult`: `resolvedMatchday`, `transferWindowOpened`, `transferWindowClosed`,
`seasonConcluded`, `boardObjectiveVerdict`, `managerOutcome`. Nothing else survives the advance.

The space-bar binding the seed doc describes did double duty, continuing the game and stepping through
unread news. Only the first half of that is left to decide here.

**The Continue result becomes the primary notification surface.** Ticket 05 moved the transient half
of the notification load onto whatever this ticket renders at the point of the press, so how that is
displayed is now load-bearing rather than a detail. Ticket 05's stated risk is that this gets rendered
thinly and the player ends up with less than either design would have given.

**The readiness question got sharper.** The human's club starts with no Tactic at all
(`aiClubs.test.ts`: every AI club is assigned one at Season start, "the user's club gets none"), and
nothing in the game says so. With no message to announce it, the "what does Continue do when the
manager has not done something required" question needs a **persistent** affordance, since a
dismissible notice can be dismissed while the condition it describes is still true. Ticket 07 owns the
full inventory of unset-at-creation state; ticket 08 owns the copy.

See [Agent Note: No onboarding inbox](../../../.agents/notes/proposed/architecture/2026-08-29-no-onboarding-inbox.md).

## Answer

**Continue becomes a persistent application-shell control, keeps its label, stops at every boundary
`AdvanceCalendarResult` can report, renders one structured durable result per press, and refuses to
cross into the human's match with invalid or absent required setup while never blocking advancement
before that boundary.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-continue-as-global-career-loop.md).

## Amendment from ticket 08 (contextual help)

This ticket fixed the stop set as exactly the fields on `AdvanceCalendarResult` and ruled that
anything absent from that contract passes silently. Those seven fields cannot express **arrival at
the human Fixture's pre-match boundary** or the **readiness blockers** waiting there, so under the
contract as written the first Continue is structurally unable to say "you have arrived at Matchday 1
and you have no Tactic" — which is precisely what that press must say.

`AdvanceCalendarResult` therefore gains an explicit, nullable pre-match boundary carrying the pending
fixture, matchday, opponent, home/away, and typed readiness blockers in the same vocabulary
`startMatch` validation consumes. This **applies** this ticket's own rule (anything that should become
a stop must be exposed authoritatively first) rather than overriding it, and it does not reopen the
always-true "human played" flag rejected here: the boundary field is genuinely null whenever an
advance does not reach the human's Fixture. Readiness on the result is advisory — the boundary
recomputes it on every read and `startMatch` stays authoritative.

The structured durable surface renders in fixed order: **what happened**, **what is next**, **what is
unresolved**, **what you can do** — unresolved before actions, so the blocker is read before the
actions it disables. A section with no authoritative typed data renders nothing at all; no
placeholders. The renderer must not reconstruct boundary arrival or readiness from the current route,
a fixture lookup, a null-Tactic check, or a before-and-after comparison.

See [Agent Note: Contextual help as a typed projection of the simulation model](../../../.agents/notes/proposed/architecture/2026-08-29-contextual-help-mechanical-provenance.md).
