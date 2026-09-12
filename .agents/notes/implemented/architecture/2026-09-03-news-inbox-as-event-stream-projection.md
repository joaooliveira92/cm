# Agent Note: The News Inbox is a projection over the event streams

Status: implemented

> Supersedes [No onboarding inbox](../../proposed/architecture/2026-08-29-no-onboarding-inbox.md).
> That note declined the inbox outright — "v1 ships no inbox, no news screen, and no message feed" —
> and its acceptance criteria forbade a `messages` table, a message projection, a read/unread flag,
> and an RPC method returning messages. The inbox is now a shipped feature, so that note's ruling is
> withdrawn in full. What survives from it is its cost analysis, which is what shaped the design
> below: three of the four things it forbade are still not built, because the fourth turned out to
> be enough.
>
> Depends on [Event streams and read models at world scale](../../proposed/architecture/2026-09-02-event-streams-and-read-models.md),
> which is what makes this decision cheap and which did not exist when the inbox was declined. That
> note established the Season stream as "the career's narrative", restricted the Club stream to the
> human's club, and defined a read model as a query shape over authoritative tables rather than a
> materialised table. The inbox is exactly such a query shape.

## Problem

The News Inbox was ruled out of v1 on 2026-08-29 and has been reinstated as a core feature. The
question this note settles is not *whether* — that was decided by the person who owns the product —
but what the inbox is made of, given that the reasoning which rejected it was largely correct on the
facts.

The 2026-08-29 note made three arguments. Two of them still hold and one has been overtaken:

- **"Nothing is pending."** Still true. Every AI action resolves synchronously inside the command
  that triggers it; `runAiTransferWindow` still resolves each bid through `decideAiSellerResponse`
  with no human in the loop, and no shipped path writes a pending Bid with the user's club as
  seller. There is still no queue of decisions waiting on the manager.
- **"Everything else is already a return value."** Still true of the *transient* case.
  `AdvanceCalendarResult` still carries what one advance changed.
- **"An inbox means a `messages` table, a projection, RPC methods, and a read/unread mutation."**
  This is the one that no longer holds, and it was carrying most of the cost.

## Decision

**The News Inbox ships as a read model over the `events` log. No message is stored, no projector
runs, and the only thing written anywhere is whether the manager has read, flagged, or archived
something.**

### The event log is already the message feed

The 2026-08-29 note priced an inbox as "a global ordered feed built from per-club and per-match
streams that have no global ordering today". That premise was withdrawn a week later. The
event-streams note fixed the Season stream as one stream per save carrying `SeasonStarted`, the
transfer-window boundaries, `MatchdayResolved`, `SeasonConcluded`, `BoardObjectiveJudged`, and
`ManagerWarned`/`Sacked`/`Retired`, on the explicit ground that "these are the career's narrative and
no table records the sequence". A stream that is one per save, appended in career order, and
described in its own note as the career's narrative *is* a global ordered feed. The inbox reads it.

So the message projection is a `SELECT` with an `ORDER BY`, and the copy is a pure function from an
event tag and its payload. `packages/shared/src/newsProjection.ts` holds both, takes facts rather
than fetching them, and is unit-tested with no database.

### What is not built, and why each one stayed out

- **No `messages` table.** Storing a message would give one fact two sources that can disagree, and
  the event-streams note has now rejected that shape four times. A message is derived on read, like
  Position Rating, Overall Rating, and Transfer Value before it.
- **No message id is minted.** A message *is* its position in the log:
  `"<stream_type>:<stream_id>:<seq>"`. This is the load-bearing consequence of not storing messages —
  it makes a message id unable to name something that does not exist, makes the same career event the
  same message across reloads, and means the state table's primary key is a foreign key to the log in
  everything but name.
- **No projector, no invalidation.** There is nothing to keep in sync. An advance appends events and
  the inbox's next read sees them; `news.test.ts` asserts exactly this ("advancing the calendar adds
  messages without a projector running").
- **No action-required workflow, no deadlines.** Screens 24-26 specify an `actionState` of
  `none | optional | required | completed | expired` and a deadline per message. The 2026-08-29
  note's "nothing is pending" argument was unrefuted at the time, so there was no referent for any
  value but `none`. Shipping a five-state enum that could only ever hold one value, and a UI for
  filtering on it, would have been building the container before anything could go in it.

  **Closed on 2026-09-03**, on exactly the trigger this note named, by
  [AI clubs bid for your players](2026-09-03-the-first-pending-decision.md). `actionState` now
  carries `none | required | completed | expired`, derived live from the `bids` row rather than
  stored on the message. `optional` is still not modelled — nothing in the game asks for a decision
  the manager may skip without consequence. Deadlines are still not modelled either: a pending Bid
  lapses on the next Continue, which is a rule about the loop rather than a per-message date.
- **No unread-driven Continue stop.** The 2026-08-29 note handed the career loop a simplification —
  "an unread message exists" is not available as a stop condition — and that stands. The inbox does
  not interrupt anything.

### Read state is the one write, and it is user state

Read, flagged, and archived cannot be derived from the log, because they are facts about the person
rather than about the world. They live in `news_message_state`, keyed by the event's own coordinates,
with a row created only when the manager first acts on a message. A save that is only ever read
writes nothing, which `news.test.ts` asserts by counting rows.

The old note called a read/unread mutation "its own design argument: read/unread is user state, not
simulation state, and the map's existing decisions show how much scrutiny a single persisted row
attracts here". That scrutiny produced two rulings:

- **The archived-save guard does not apply.** `assertSaveNotArchived` protects simulation state. A
  dismissal archives the save, and the message announcing the dismissal is the last thing in the
  inbox; blocking the write would leave it permanently unread on the only save it appears in.
- **A bulk action is all-or-nothing.** Every id is validated against the log before anything is
  written. A bulk action that silently skipped unknown ids would report success over work it did not
  do, and the failure would be invisible.

### The distributed answer stays

The 2026-08-29 note replaced the inbox with two things: the Continue result rendered at the point of
the press, and named surfacing duties on the six existing screens. **Both stay, unchanged.** The
inbox is a career record, not a replacement for either.

This is the clause most at risk of quiet erosion. The old note's own stated risk was that six screens
with surfacing duties are six places to forget; adding a seventh screen that lists everything makes
it tempting to let the other six lapse, and the failure would be silent. Nothing in the inbox
supersedes the Squad screen's Condition column, the Fixtures screen's next opponent, or the readiness
affordance next to Continue.

### Vocabulary

"Inbox" is no longer reserved to the Transfer Bid queue. `CONTEXT.md` gains **News Message** and
**News Inbox** entries and the **Transfer Inbox** entry keeps its name while losing its claim to be
"the only thing inbox means in the project" — that sentence is now false, and leaving it would send
the next reader to a rule the code contradicts.

## Alternatives considered

- **Keep the 2026-08-29 decision and decline again.** Not available: the request was reaffirmed after
  the contradiction was raised. Recorded here so the note's reversal reads as a decision rather than
  as drift.
- **A `messages` table written by a projector reacting to each append.** What the old note priced and
  what the import implies. Rejected on the same grounds it was rejected then, and now more cheaply:
  the table would carry no fact the log does not, and it would need invalidating on every advance.
- **Store messages but derive nothing** — write a message row at the point each event is appended,
  from inside `advanceCalendar`. Tempting because it puts the copy next to the code that knows the
  most. Rejected because it makes the copy un-editable: changing a message's wording would only
  affect messages generated after the change, so a save would carry a mix of old and new phrasings
  with no way to tell which.
- **A read-only feed with no read/unread model.** The old note considered this and rejected it for
  failing the onboarding test. It is cheaper still — zero writes — but an inbox whose unread count
  never moves is a log, and the unread count is what makes the screen worth opening.
- **Ship the `actionState` enum now, always `none`, so the shape is ready.** Rejected as the worst of
  both: it commits to the vocabulary, which is the hardest part, while shipping none of the value,
  and the shape would be a guess at what a pending-decision system needs.
- **Message ids as a separate minted identifier** (a UUID column on a state table). Rejected: it
  would allow a state row to name a message that does not exist, which is the failure the coordinate
  id makes unrepresentable.
- **A separate route per screen** — inbox, message, and filters as three routes, as the import
  numbers them. Rejected: the import's own §14 asks for list-and-detail at desktop widths, and one
  route makes "open a message without losing inbox position" free rather than a focus-restoration
  problem.

## Consequences

- `newsProjection.ts` (pure, in `@cm-clone/shared`) owns the category mapping, the copy, the
  filters, and the counts. `news.ts` (main) owns the query and the one write. `news/` (renderer) owns
  the screen and its selection rules. Each layer is tested at its own seam.
- A new event tag that carries news needs a case in `project`; one that does not needs nothing. An
  unrecognised tag is skipped rather than rendered, so adding an event can never surface empty copy.
- The inbox has no dates. `occurredAt` is the log's wall-clock `created_at` and orders the list;
  in-world position is carried by `seasonNumber`/`matchday`. This is a direct consequence of the
  date-bearing Calendar not having landed, and the projection's `occurredAt` becomes the in-world
  date when `events.game_date` does.
- Filtering and counting run in the renderer over the full loaded inbox. The import's §15 asks for
  virtualization, debounced search, and cancellable queries; a few hundred messages over a
  twenty-season career does not need any of them. `filterNews` being a pure function over the whole
  set is the seam that makes them addable without restructuring.
- The multiplayer and permission clauses of Screens 24-26 (§10 throughout, "do not reveal another
  hot-seat manager's inbox" in §16) are not implemented. The multiplayer axis is removed wholesale
  for this project, so there is no second manager to scope against; the inbox is scoped to the human
  club because that is the only club there is.
- `continueReadiness.ts` no longer opens by asserting the project ships no news feed.

## Risks

- ~~**The old note's "nothing is pending" argument is now load-bearing in a new place.**~~
  *Retired 2026-09-03.* This risk fired as written — AI origination landed — and was answered rather
  than realised: `actionState` is derived live from the `bids` row, so a message about an open
  decision cannot be read-and-forgotten into looking settled, and archiving one does not drop it from
  the action-required count.
- **Copy lives in one pure function and is not localized.** Every subject and body is an English
  template with interpolated values. `newsProjection.ts` is the single place that changes when
  localization arrives, which is the cheap version of this problem, but §13's "complete message
  templates rather than concatenated translated fragments" is not satisfied today — several bodies
  concatenate a clause built by `plural()`.
- **The six screens' surfacing duties are now easier to let lapse**, per the section above. Nothing
  enforces them and the inbox makes forgetting them less visible.
- **Archived is not deletion, and nothing prunes `news_message_state`.** The table grows with manager
  actions rather than with the world, so it is small, but a row survives its event if a future
  pruning rule ever deletes a Season-stream event. No such rule exists — the event-streams note prunes
  only Match streams — so this is a hazard for whoever writes the second pruning rule, not a defect
  today.
