# Where the Continue command lives

Type: grilling
Status: open
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
