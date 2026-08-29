# Does onboarding need an inbox?

Type: grilling
Status: open

## Question

The seed doc's central mechanism (section 6) is the news/inbox screen: rather than a tutorial
checklist, the game emits messages that create reasons to visit each screen. An injury message sends
you to the squad; a match-preview message sends you to tactics. The doc calls this event-driven
onboarding and treats it as the thing that replaces a tutorial.

Our v1 screen list is locked in [.scratch/cm-clone/map.md](../../cm-clone/map.md) and contains no
inbox: Squad, Tactics, League table, Fixtures, Match day, Transfers, Season summary.

This is the map's biggest scoping decision. If the answer is no, several downstream tickets and most
of the "Not yet specified" fog collapse.

Open questions:

- **Does the onboarding spec require an inbox at all**, or can the existing screens carry the load
  (a fixtures screen that surfaces the next match, a squad screen that surfaces injuries, a transfers
  screen that surfaces bids)? Distributed notification versus a single feed.
- If an inbox is warranted, is it an **onboarding device** (early-career guidance messages that taper
  off) or a **permanent game system** (the general event feed for the whole career)? These are very
  different artifacts; the first is arguably the scripted tutorial the map rules out of scope, wearing
  a diegetic costume.
- What is the **cost**? A new screen, an event→message projection over the existing event stream, RPC
  surface, and a read/unread model. Weigh honestly against the alternative of surfacing the same
  events on the screens that already exist.
- If yes: does adding a screen to a locked v1 screen list need to be recorded as an ADR, or is
  amending it within this map's authority?
- Does the answer change if ticket 02 concludes that most manager-pillar effects are cut? A thinner
  simulation emits fewer events worth a message.
