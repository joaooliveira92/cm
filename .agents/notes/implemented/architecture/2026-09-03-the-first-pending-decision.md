# Agent Note: AI clubs bid for your players — the first pending decision

Status: implemented

> Revises the load-bearing premise of
> [No onboarding inbox](../../proposed/architecture/2026-08-29-no-onboarding-inbox.md) and of
> [The News Inbox is a projection over the event streams](2026-09-03-news-inbox-as-event-stream-projection.md).
> Both rested on "nothing is pending" — every AI action resolving inside the command that triggered
> it. That is no longer true, and both notes named this exact change as the thing that would end it.
> The inbox note's largest deliberate gap, `actionState`, closes here.

## Problem

A complete, tested, shipped feature was unreachable in play.

`TransfersScreen.tsx` renders an incoming-bids section with Accept, Counter, and Reject controls, a
counter-amount field, and error handling. `respondToBid` guards on `bid.status !== "pending"`. The
`bids` table's CHECK constraint admits `pending`. `TransfersScreenView.incomingBids` is in the
contract.

Nothing ever wrote a `pending` bid. Both insert sites — `placeBid` and `aiPlaceBid` — called
`decideAiSellerResponse` unconditionally and inserted the bid already terminal. Neither branched on
who the seller was. So `incomingBids` was always empty, `pending` was unreachable, and the whole
seller side of the negotiation was dead code with a user interface attached. The 2026-08-29 note had
observed the symptom — "the only rows that reach that field are inserted by tests" — and drew a
conclusion about the inbox from it, without recording that the cause was a missing branch.

The deeper problem is what that implies about the career loop: **nothing in the simulation waited on
the manager.** Continue was a button that advanced time, never a button that deferred a decision.

## Decision

**A Bid for one of the human club's players is left pending. It is answered by the manager or by
nobody, and if by nobody it lapses on the next Continue.**

### The seller decides how a bid resolves

`aiPlaceBid` now branches on `clubs.is_user_club` for the *selling* club. An AI seller answers
instantly through `decideAiSellerResponse`, exactly as before — `aiClubs.ts` bids Transfer Value, so
that is an outright accept in practice. A human seller gets a `pending` row and nothing else happens.

This is a one-branch change, and its smallness is the point: the machinery to answer a bid was
already built, tested, and wired to a screen. What was missing was anything that could ask.

### One Continue to answer, and lapsing is an answer

`expireStalePendingBids` runs at the **start** of `advanceCalendar`, before the boundary work and
before `runAiTransferWindow`. That placement is the rule: a bid placed later in the same advance is
inserted after the statement and survives it, and is still pending at the start of the next advance
only if the manager left it alone.

Running it at the start is also why no `placed_at_matchday` column exists. "Was this here before the
player pressed Continue" is precisely what being pending at that moment means, so the timing carries
the fact that a column would otherwise have to.

**Expiry is tied to the loop, not to the transfer window.** The obvious alternative — lapse at window
close — is wrong here because `runAiTransferWindow` fires *as* the pre-season window closes (there is
no earlier open moment to hook, and `season.ts` says so), so every pre-season bid would expire in the
same advance that created it.

`expired` is its own status rather than a reuse of `rejected`, because "you never answered" and "you
said no" are different facts and the inbox reports them differently.

### Continue stays advisory

A pending bid raises an advisory, never a blocker. Letting a bid lapse is a legitimate answer, and
blocking the career loop on a negotiation the manager may not care about turns an ignorable notice
into a soft-lock — which is the failure mode `continueReadiness.ts` was built to avoid.

The advisory's copy names the *consequence* rather than the count: "Advancing lets it lapse." This is
the one advisory the advance itself resolves, and an advisory that reported only a number would be a
trap rather than a notice. It is also ordered ahead of the no-Tactic advisory, because the career
band renders one advisory and the condition the advance destroys has to outrank the standing
condition that will still be true afterwards.

### The inbox reports the decision; the Transfers screen owns it

`aiPlaceBid` appends `BidReceived` to the human club's stream, and the News Inbox projects a message
from it. The message's `actionState` is read **live from the `bids` row**, never from the event
payload: the event records that the bid arrived and is immutable, while whether it is still open is a
fact the manager changes. So a message cannot claim a decision is open after it has been answered,
and the same message becomes "settled" or "lapsed" without anything rewriting it.

The message carries a route to the Transfers screen and no Accept/Reject controls of its own. A
second respond surface would be a second source of truth for the same decision.

This is the design the inbox note anticipated: an inbox message that is a projection of the log,
whose one mutable aspect is derived from the authoritative table at query time.

### A guarantee pass, because the market alone never asks

Weakness-driven buying would leave the seller branch unreachable in practice. After it runs, a
deterministic post-pass checks whether the human club has an **open** bid, and if not, bids for its
strongest affordable player from the AI club with the most Wage Budget headroom — headroom rather
than raw budget, so that accepting never trips `completeTransfer`'s own affordability checks.

**The guard counts pending bids, not all bids.** Counting every bid ever sent to the human club makes
the pass fire once per *career* rather than once per window, because the first window's bid is still
on the table — answered or lapsed — for every window after it. Measured before the fix: exactly one
incoming bid across a forty-advance career. What the pass guards against is the manager having
nothing to answer, which is a question about open bids only, and `incoming-bids.test.ts` now walks to
a second window to hold that.

### The chrome reads the inbox

The career chrome now reads `getNewsInbox` and uses it twice: the unread badge on the News
destination, and `counts.actionRequired` as the readiness advisory's input. Reading
`getTransfersScreen` for the count instead would have pulled in `loadAllPlayersEcon` — every player's
economics — for a number the inbox already computes over a few hundred event rows.

Without the badge the inbox is only seen by a manager who thinks to look, which is the same outcome
as not having one.

### A fixed ordering defect

The inbox ordered by `(created_at, seq)`. `seq` counts within one stream, so the Season stream's seq
1 and the club stream's seq 1 are not comparable, and `created_at` ties whenever two events land in
the same second — which is every advance. Adding `BidReceived` to the club stream made this visible
immediately. Ordering is now by the log's global append order (SQLite's `rowid`), which is the true
narrative order and the thing `seq` was standing in for.

## What this does not change

**AI clubs still bid exactly Transfer Value.** The decision worth having is not haggling over the
opening number: it is accept now, or counter and risk the withdrawal, against an AI bidder that
tolerates up to 1.15x Transfer Value in `resolveAiCounterOffer`. That range already existed and is
now reachable.

**AI target selection is unchanged.** The weakness-driven pass still ranks free agents alongside
squad players and still resolves every non-human seller inline, so it alone would essentially never
bid on the manager's players — measured at 4-9 bids league-wide per season, with none against the
human club in several sampled saves. That gap is closed by a separate guarantee pass rather than by
rebalancing the market; see below.

## Alternatives considered

- **Block Continue until every bid is answered.** The classic management-game behaviour, and it makes
  the decision impossible to miss. Rejected: it makes the career loop hostage to a UI surface
  correctly rendering, and `continueReadiness.ts`'s own rule is that an advisory the player ignores
  must stay ignorable.
- **Let pending bids persist until the transfer window closes.** More generous, and closer to how a
  real window works. Rejected on the pre-season case above, where the window closes in the same
  advance the bid is placed — the rule would either expire everything instantly or need a special
  case for exactly the moment most bids are created.
- **A `placed_at_matchday` column and an explicit age check.** More flexible, and it would let the
  window survive several advances. Rejected as a column that stores what statement ordering already
  says; it becomes worth adding the day the lifetime stops being "one advance".
- **Reuse `rejected` for a lapsed bid.** One less status. Rejected: the inbox would then tell the
  manager they rejected an offer they never saw.
- **Emit a `BidExpired` event and project a second message.** Rejected: two messages for one
  negotiation, and the first would keep claiming a decision was open. Deriving `actionState` live
  gives one message that stays correct.
- **Answer the bid from the inbox.** Tempting, since the message is where the manager finds out.
  Rejected: two respond surfaces over one row, and the inbox would need the bid's full state to
  render the controls, which is the coupling the read-model design exists to avoid.
- **Rebalance AI target selection so bids are common.** Rejected: how AI clubs choose targets is a
  league-wide balance decision, and widening it to make one flow reachable would change every club's
  transfer behaviour as a side effect. The guarantee pass below achieves the same reachability
  without touching the market.

## Consequences

- `pending`, `respondToBid`, and `TransfersScreenView.incomingBids` are reachable in play. The
  Transfers screen's incoming-bid UI is exercised by a real code path for the first time.
- `bids.status` gains `expired`; the schema CHECK and `BID_STATUSES` carry it.
- `ContinueReadinessFacts` gains `pendingIncomingBids`, so every caller must supply it. Advisory
  rule detail became a function of the facts rather than a constant string, so a rule can name a
  count.
- `NewsMessageView` gains `actionState`, `NewsCountsView` gains `actionRequired`, and the inbox gains
  an "Action required" view. The inbox note's largest stated gap is closed.
- The career chrome makes one more query, and gains the unread badge as a side effect.
- Testing an AI-window outcome end to end requires holding the world still: `incoming-bids.test.ts`
  seeds through the real `aiPlaceBid` rather than hoping a generated world produces the case, on the
  same reasoning `boardObjectives.test.ts` forces a League finish.

## Risks

- **The guarantee pass is a scripted event wearing a simulation's clothes.** Exactly one incoming
  bid per window, always for the strongest affordable player, always from the club with the most wage
  headroom. It is deterministic and it does not vary with how the season is going, so a manager who
  plays several seasons will notice the rhythm. It exists because the market underneath it does not
  produce the situation on its own — 28% of a generated world's players are free agents and an AI
  club's one target per weak Position is usually a free signing — and the honest fix is to make the
  market bid for good players, at which point this pass should be deleted rather than tuned.
- **One pending bid at a time is now an invariant nothing declares.** The guarantee pass is skipped
  while a bid is open, so the manager never faces two at once. Nothing enforces that, and the
  "one Continue to answer" fuse below is calibrated to it.
- **One advance may be too short a fuse if bids ever become common.** It is safe today only because
  the guarantee pass holds the manager to one open bid at a time. If target selection changes, or the
  pass is removed, "one Continue" may need to become a real window, and the alternatives above record
  what that would cost.
- **The advisory is the only warning, and the career band shows one advisory at a time.** A manager
  with a pending bid *and* no Tactic sees only the bid. That ordering is deliberate but it means the
  band is now a surface with more to say than room to say it, and the next advisory added will make
  that worse.
- **`expireStalePendingBids` has no seller predicate.** It relies on the invariant that only
  human-club bids can be pending. That invariant is true because `aiPlaceBid` is the only writer of
  pending rows, but nothing enforces it, and a future writer that leaves an AI-to-AI bid pending
  would find it silently expired on the next advance.
