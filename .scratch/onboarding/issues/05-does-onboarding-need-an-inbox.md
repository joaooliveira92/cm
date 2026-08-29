# Does onboarding need an inbox?

Type: grilling
Status: resolved

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

## Answer

**No inbox, no news screen, no message feed in v1. The v1 screen list stays at six.** The
notification load is distributed: transient outcomes render from the `AdvanceCalendarResult` the
Continue command already returns, and persistent state is surfaced on the screen that owns it. See
[Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-no-onboarding-inbox.md).

Taking the open questions in order.

**Does the spec require an inbox at all?** No, and the reason is stronger than "the existing screens
can cope." An inbox earns a screen when the simulation produces things that wait for you, and ours
produces none. `runAiTransferWindow` runs inside `advanceCalendar`, and `aiPlaceBid` resolves the
selling club through `decideAiSellerResponse` without branching on whether that seller is the human's
club. `apps/desktop/test/aiClubs.test.ts` states it outright: "resolved with no human ever in the
loop." `respondToBid` and `TransfersScreenView.incomingBids` both exist, but no shipped path writes a
pending Bid with the user as seller. Every row in that field today comes from a test fixture. The
queue is empty by construction.

Everything that is left is already a return value. `AdvanceCalendarResult` carries the season,
`resolvedMatchday`, `transferWindowOpened`/`Closed`, `seasonConcluded`, `boardObjectiveVerdict`, and
`managerOutcome`. An inbox would persist those facts a second time in message form so a second screen
could display them.

The doc's canonical example does not survive either. Our `Injury` is a match event that sets
`player_fitness.last_injury_severity` and dents Condition, and severity then modulates recovery
between Fixtures. There is no unavailability and no selection ban, so "an injury message sends you to
the squad" has nothing to say that the Squad screen's Condition column does not already say.

**Onboarding device or permanent system?** Neither, and the fork is the reason. A guidance sequence
that tapers off is the scripted tutorial the map rules out of scope with better prose on it. A
permanent career feed is not an onboarding feature at all, and building it here would commit a future
owner to a screen shape for reasons that have nothing to do with onboarding.

**Cost.** A seventh screen, a globally ordered feed assembled from per-club and per-match streams
that have no global ordering today, at least two RPC methods, a `messages` table, and a mark-read
mutation that is user state rather than simulation state. Weighed against re-presenting values the
Continue command already returns synchronously, it does not clear.

**ADR or map authority?** Map authority, and moot here since nothing is added. The v1 screen list
lives in a wayfinder map, not an ADR, and per-screen calls have been treated as map-level throughout.

**Does ticket 02's cut change the answer?** It supports it without carrying it. Cutting morale, the
dressing room, press conferences, and coaching staff removes most of section 6's message categories,
but the argument that decides this is the synchronous resolution of every AI action, which would hold
at any simulation depth. Restoring every cut system would give an inbox more to say and still nothing
to wait for.

### What the answer surfaces

The human's club starts with **no Tactic at all**. `aiClubs.test.ts` asserts every AI club gets one at
Season start and "the user's club gets none," and nothing in the game tells the player. This is the
sharpest onboarding gap the ticket turned up, and it is precisely what an inbox message would have
covered. It belongs to a persistent readiness affordance next to Continue rather than a message that
can be dismissed while the condition it describes is still true. Carried into tickets 06, 07, and 08.
