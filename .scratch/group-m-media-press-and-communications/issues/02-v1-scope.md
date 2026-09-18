# 02: Does CONTEXT.md's v1 exclusion of media handling get overturned?

Type: grilling
Status: needs-info

## Question

**Do you want to overturn CONTEXT.md's recorded exclusion of media handling from v1?**

This was charted as an open scope question. [Ticket 01](01-screen-inventory.md) showed it is not one.
CONTEXT.md — which ENGINEERING-CONTRACT calls binding for domain language — already rules this group
out, in two places, both verified verbatim:

> It does not govern player contracts, wage negotiation, promised playing time, dressing-room
> relationships, **media handling**, or board relations - none of those systems ship in v1.
> — CONTEXT.md:751-753 (**Influence**)

> There is no training or **press content** to occupy a date with no Fixture, so a finer-grained
> clock would have nothing to display.
> — CONTEXT.md:445-447 (**Calendar**)

So the honest question is not "which of these 13 screens are in v1". It is whether a recorded
decision gets reversed. The contract is explicit that this may not happen by drift: a recorded
decision "is overturned by a new ADR, not by an implementation that quietly diverges". Reversing it
means changing CONTEXT.md in the same commit as the code, not letting the two disagree.

## What ticket 01 established

- All 13 screens are Absent — not stubbed, not routed, not named anywhere.
- No manager reputation, player morale, board opinion, or relationship model exists. The board has
  one annual verdict from league position plus a consecutive-miss counter; nothing else moves it.
- No command in the game produces text. Every existing command mutates world state.
- CONTEXT.md has no vocabulary for journalist, outlet, interview, briefing, rumour, transcript,
  statement, publication, embargo or deadline.
- The News Message model cannot represent a message with no backing `events` row, has no author or
  recipient, and its Category is a closed union in three places.

## The options, honestly costed

### A — keep the recorded decision. Group M is out of v1.

The 13 screens stay absent. This map closes as a deviation register saying so, and the effort ends.
Costs nothing and contradicts nothing. **This is what the repo currently says.**

### B — flavour only: media as read-only content

Rumours and reports the player reads but cannot influence. No new player inputs, no consequence
model. Needs generated prose, which must be deterministic per ENGINEERING-CONTRACT § Determinism —
the existing Commentary Template mechanism is the precedent and it is seeded from the match seed.
Would reuse or extend News Message. Still requires amending CONTEXT.md:445-447, since "press content"
is named there as the thing that does not exist.

### C — interactive: press conferences and statements with modelled consequences

The imported spec's intent, and by far the largest option. Requires inventing at minimum: a manager
reputation model, a morale or opinion model, a consequence decider, persistence and migration, and
balance numbers — none of which exist, and balance numbers are a design decision, not a research
finding. It also needs a clock that stops on non-Fixture dates, which the Calendar deliberately does
not do; screens 184 and 185 assume exactly that clock. This is a multi-effort programme, not a group.

## Also settle, if the answer is B or C

Is "Media Centre" (181) a distinct concept from the shipped **News Inbox**, a facet of it, or a
rename? CONTEXT.md:915-921 defines the inbox as "a career record, not a work queue" and lists News
feed / Message centre / Notification centre as _Avoid_. The Transfer Inbox entry already warns that
"Inbox unqualified" is ambiguous; a third inbox-shaped surface sharpens that. Note also that
**Category** is already overloaded — Attribute categories (CONTEXT.md:14-18) and News Message
categories are two senses; a media category would be a third.

## Recommendation

**Option A.** Not because media is a bad idea, but because nothing in the repo supports it and
CONTEXT.md already says so deliberately rather than by omission — the Influence entry names media
handling in a list of systems consciously excluded, and the Calendar entry treats the absence of press
content as load-bearing for how time works. Reversing that is a product decision with a programme
behind it, and it should be taken deliberately by a human, not absorbed into a screen-reconciliation
effort because 13 spec files happened to be next in the queue.

