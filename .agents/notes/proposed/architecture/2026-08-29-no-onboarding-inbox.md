# Agent Note: No onboarding inbox

Status: superseded

> **Superseded on 2026-09-03 by
> [The News Inbox is a projection over the event streams](../../implemented/architecture/2026-09-03-news-inbox-as-event-stream-projection.md).**
> The News Inbox shipped as a core feature, so this note's ruling — "v1 ships no inbox, no news
> screen, and no message feed" — and every acceptance criterion below are withdrawn. Read it for the
> cost analysis, not for the decision: the "nothing is pending" argument is unrefuted and is what
> keeps the shipped inbox from carrying an action-required workflow, and the distributed answer
> (the Continue result, plus named surfacing duties on the six existing screens) is explicitly
> retained by the superseding note rather than replaced by the screen.
>
> The premise that broke was the cost, not the reasoning. This note priced an inbox as a `messages`
> table plus a projector plus a read/unread mutation, over streams that "have no global ordering
> today". [Event streams and read models at world scale](2026-09-02-event-streams-and-read-models.md)
> withdrew that premise a week later by fixing the Season stream as the career's ordered narrative,
> which left the inbox as a query over a log that already existed.

## Problem

The seed doc's central onboarding mechanism (section 6) is the news/inbox screen. Rather than a
tutorial checklist, the game emits messages that manufacture reasons to visit each screen. An injury
message sends you to the squad, a match preview sends you to tactics, a board message explains
expectations. The doc calls this event-driven onboarding and treats it as the thing that replaces a
tutorial. The onboarding map keeps that simulation-first spine, so the inbox arrives with a strong
prior in its favour.

The v1 screen list locked in `.scratch/cm-clone/map.md` has no such screen. It lists Club/Squad,
Tactics, League table & fixtures, Match day, Transfer market/inbox, and Season summary. The word
"inbox" appears there, but it means the Transfer market's Bid queue, not a news feed.

This is the onboarding map's largest scoping question. An inbox means a seventh screen, a projection
from the event streams into messages, RPC methods, a read/unread model, and a coupling to wherever
the Continue command ends up. It also decides how much of the map's remaining fog is real: the
"Inbox message catalog" entry exists only if the answer is yes.

## Proposal

**v1 ships no inbox, no news screen, and no message feed. The notification load is distributed:
transient outcomes are rendered from the `AdvanceCalendarResult` the Continue command already
returns, and persistent state is surfaced on the screen that owns it.**

### The decisive fact: nothing is pending

An inbox earns its cost when the simulation produces things that wait for you. Ours produces none.
Every AI action resolves synchronously inside the command that triggers it, before that command
returns.

`runAiTransferWindow` in `apps/desktop/src/main/aiClubs.ts` runs inside `advanceCalendar`, and each
AI bid it places goes through `aiPlaceBid`, which resolves the selling club immediately via
`decideAiSellerResponse`. That path does not branch on whether the seller is the human's club. An AI
club bidding for one of your players buys it, and `apps/desktop/test/aiClubs.test.ts` says so in as
many words: "resolved with no human ever in the loop." `respondToBid` exists in the RPC group and
`TransfersScreenView.incomingBids` exists in the schema, but no shipped code path ever writes a
pending Bid with the user's club as seller. The only rows that reach that field are inserted by
tests.

So the queue an inbox would render is empty, and it is empty structurally, not by accident of tuning.
Building the container before anything can go in it is the wrong order.

### Everything else is already a return value

The between-Continue event vocabulary outside a match is small: `SeasonStarted`,
`TransferWindowOpened`, `TransferWindowClosed`, `MatchdayResolved`, `SeasonConcluded`,
`PlayerDeveloped`, `BoardObjectiveJudged`, `ManagerWarned`, `ManagerSacked`, plus the transfer
events. `AdvanceCalendarResult` in `packages/contracts/src/schemas.ts` already carries the season,
`resolvedMatchday`, `transferWindowOpened`, `transferWindowClosed`, `seasonConcluded`,
`boardObjectiveVerdict`, and `managerOutcome`. The projection an inbox would build over the streams
is a projection the command already hands back, synchronously, in the same round trip.

Adding an inbox would mean persisting that same information a second time, in message form, so a
second screen could show it. The message is not new information. It is the return value with a
read/unread bit attached.

### The doc's ten message types do not survive contact with our systems

Section 6 lists what early messages were about. Against this codebase:

- Manager appointment, board expectations: one-time, and the Board Objective is standing state that
  belongs on a screen permanently, not in a message you can mark read and lose.
- Competition participation, squad registration, media questions: no counterpart. One fixed League,
  no registration rules, no press system.
- Staff recommendations: there are no staff. Ticket 02 cut the coaching-staff system.
- Contract situations: contract expiry fires in bulk at `SeasonConcluded`, which is the moment the
  Season summary screen exists to explain.
- Preseason fixtures, match previews: the Fixtures screen's whole job.
- Transfer developments: resolved before the command returns, per above.
- Injuries: this one deserves its own paragraph.

Our injuries are not the doc's injuries. An `Injury` event is a match-simulation event that sets
`player_fitness.last_injury_severity` and dents Condition, and severity then modulates the recovery
rate between Fixtures. There is no unavailability, no "out for six weeks", no selection ban. So the
canonical example of an inbox message, the injury that makes you go look at your squad, has nothing
to tell you that the Condition column on the Squad screen does not already show, more precisely and
without a message to dismiss.

### The onboarding-device fork is a trap

If the inbox is an onboarding device whose messages taper off as the player learns, it is the
scripted tutorial the map rules out of scope, wearing a diegetic costume. A guidance message that
stops arriving once you are experienced is a tutorial step with better prose.

If instead it is the permanent event feed for the whole career, then it is not an onboarding feature
at all. It belongs to whoever owns the long-run career loop, sized against systems that do not exist
yet, and the onboarding effort would be committing a future owner to a screen shape for reasons that
are not onboarding reasons.

Neither branch is a thing onboarding should build. That fork was the strongest argument I expected to
find for the inbox, and it collapses from both ends.

### The Calendar has nothing to fill a feed with

CONTEXT.md's Calendar definition already settled that time advances only by jumping to the next
scheduled event, never by a day-by-day clock, because v1 has nothing to occupy a day with no Fixture.
A Season therefore has around forty stops, each of which is a Matchday or a Window boundary. A feed
over that is a list of forty rows saying which Matchday just resolved. The League table and Fixtures
screens present the same forty facts with standings and opponents attached.

### What replaces it

The inbox was carrying real load, and dropping the screen does not drop the load. It moves to two
places.

**The Continue result, rendered at the point of the press.** `advanceCalendar` returns what changed;
the UI states what changed, transiently, where the player is standing. Ticket 06 owns where Continue
lives and what it stops for, and this decision hands it a simplification: "an unread message exists"
is no longer available as the stop condition, so each interrupt needs its own answer, and the answer
set is the fields on `AdvanceCalendarResult`.

**Named surfacing duties on the six existing screens.** Each screen owns the state it already holds:

- Fixtures: the next unplayed Fixture and its opponent, home or away.
- Squad: Condition and recent injury severity, so depletion is visible without being announced.
- Tactics: whether a Tactic is set at all.
- League table: current position against the Board Objective band.
- Transfers: budgets, Window state, and outgoing Bid outcomes. `incomingBids` stays in the view and
  stays empty until AI origination into the human club is built.
- Season summary: the Verdict and manager status.

One of those is not currently satisfied and is the sharpest onboarding gap this ticket found. The
human's club starts with **no Tactic at all**. `aiClubs.test.ts` asserts it directly: every AI club
gets a Tactic at Season start, "the user's club gets none." Nothing in the game tells the player
this. It is exactly the kind of thing an inbox message would have covered, and it is better served by
a persistent readiness affordance next to Continue than by a message that can be dismissed while the
condition it describes is still true. Tickets 06 and 08 own the affordance; ticket 07's audit should
confirm the full list of unset-at-creation state.

### Authority and vocabulary

Amending the locked v1 screen list is within this map's authority and does not need an ADR. This
decision does not amend it: it declines to add a screen, so the list stands as locked. Had the answer
been yes, the same reasoning would apply, since the screen list lives in a wayfinder map rather than
an ADR and per-screen decisions have been treated as map-level throughout. `docs/adr/` is for
repo-wide structural decisions, and one more screen in a single-app renderer is not that.

"Inbox" is now a reserved word. It means the Transfer market's Bid queue and nothing else, and
CONTEXT.md gains a Transfer Inbox entry saying so, because the seed doc uses the same word for the
news feed and that collision will otherwise be re-litigated by whoever reads section 6 next.

### Does ticket 02 change the answer

The question anticipated that a thinner simulation emits fewer events worth a message, and it does,
but that turned out not to be the load-bearing argument. Ticket 02 cut morale, loyalty, youth,
discipline, the dressing room, press conferences, and coaching staff, which removes most of the doc's
message categories. Even so, the argument that decides this is the synchronous resolution of every
AI action, and that would hold at any simulation depth. Restoring every cut system would give an
inbox more to say without giving it anything to wait for.

## Alternatives considered

**Build the inbox as the doc describes.** Rejected on cost against an empty queue. The concrete bill
is a seventh screen, a global ordered feed built from per-club and per-match streams that have no
global ordering today, at least two RPC methods, a `messages` table with read/unread state, and a
mutation that marks messages read. That mutation is its own design argument: read/unread is user
state, not simulation state, and the map's existing decisions show how much scrutiny a single
persisted row attracts here. All of it to re-present values `advanceCalendar` already returns.

**A read-only feed with no read/unread model**, a scrolling history of what happened. Cheaper, and I
considered it seriously, because a career history has genuine value. It fails the onboarding test
rather than the cost test: a passive log creates no reason to visit any screen, which was the entire
mechanism section 6 was proposing. It also loses the argument for being onboarding work at all. If
someone wants a career log later, it should be argued for as a career-history feature on its own
merits.

**Inbox deferred to v2, with the message projection built now** so the events are ready. Rejected as
the worst of both. It commits to the message vocabulary, the hardest part, while shipping none of the
value, and the projection would be written against a guess at what the v2 screen needs.

**A first-run-only guidance sequence, three or four messages, then silence.** This is the onboarding
device branch above, and it is the scripted tutorial the map excludes. Naming it a message does not
change what it is.

## Acceptance criteria

- The onboarding spec specifies no inbox, news screen, message feed, or message entity, and the v1
  screen list stays at six.
- The spec assigns every notification duty listed above to a named existing screen or to the Continue
  result, with no duty left unassigned.
- No ticket in this map introduces a `messages` table, a message projection, a read/unread flag, or
  an RPC method returning messages.
- CONTEXT.md defines Transfer Inbox and reserves "inbox" against the news-feed meaning.
- The map's "Inbox message catalog" fog entry is removed rather than left open, and the reason this
  effort declines the inbox is recorded in Out of scope so section 6 is not re-litigated from the
  seed doc.
- Ticket 06 answers what Continue stops for without reference to unread messages.
- The unset-Tactic gap is carried into tickets 06, 07, and 08 as a readiness affordance question, not
  dropped along with the inbox.

## Risks

**The distributed answer is only as good as the screens.** An inbox is one place to look. Six screens
with surfacing duties are six places to forget. If the Continue result is rendered thinly and the
screens do not pick up their duties, the player ends up with less than either design would have
given, and the failure is quiet. Ticket 06's answer is what makes this real or not.

**This forecloses on a career history.** Nothing here persists a narrative record of what happened,
so a future "what happened in season 1" view would start from the event streams. That is recoverable,
since the streams are the durable record and a projection can be built whenever it is wanted, but it
is not free.

**AI origination of bids into the human club would change one input, not the conclusion.** If that
gets built, a pending Bid becomes the first genuinely waiting decision in the game, and the
"nothing is pending" argument weakens by exactly one item. It still would not justify a screen: one
pending decision type belongs on the Transfers screen it already has a home on, with a count next to
Continue. The conclusion only reopens if the count of distinct pending decision types grows past
what the existing screens can carry, and this note should be revisited then rather than treated as
permanent.
