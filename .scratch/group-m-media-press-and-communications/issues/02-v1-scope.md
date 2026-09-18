# 02: v1 scope for Group M — is a media system in this game at all?

Type: grilling

## Question

Given ticket 01's inventory, which of screens 181–193 are in v1, which are deferred, and which are
out of scope entirely?

This is a **human decision**, not an agent call, and it is a larger question than Group L's
equivalent. Group L's screens were views over data the game already half-modelled. Group M is a
*system*: a Press Conference is an input the player makes, and it is only worth building if its
consequences are modelled. Absent consequences, every screen here is an elaborate no-op.

So the question underneath the scope question is: **does cm-clone want a media system in v1?**

Three broad answers, each with a different cost:

- **None.** Cut the whole group from v1. The 13 screens become deferred with no routes. Cheapest and
  entirely defensible for a first playable game.
- **Flavour only.** Media output appears as read-only content — rumours and reports the player reads
  but cannot influence. Reuses the News Message surface; needs generated text, which must be
  deterministic per ENGINEERING-CONTRACT § Determinism. No new player inputs, no consequence model.
- **Interactive.** Press conferences and statements are real inputs with modelled consequences
  (morale, reputation, relationships). This is the imported spec's intent and by far the largest
  option — it needs a consequence model, a decider, persistence, and balance decisions, none of which
  exist.

Whoever answers should also settle the **vocabulary boundary**: is "Media Centre" (181) a distinct
concept from the existing **News Inbox**, a facet of it, or a rename? CONTEXT.md is explicit that the
News Inbox is "a career record and never a queue of work" and lists News feed / Message centre /
Notification centre as _Avoid_. Introducing a second inbox-shaped surface without settling this puts
two names on one idea, which the contract treats as a real defect.

Deferred is a legitimate answer for most of this group. It does not need to be decided screen by
screen if the systemic answer is "none" or "flavour only".

**Blocked by:** [01 — Screen inventory](01-screen-inventory.md)

**Status:** needs-info
