# 09 — Changing league scope after generation

Type: grilling
Status: resolved

## Question

What happens to the provisional world when the user goes back to Step 1 and chooses a
*different* league scope?

Today: nothing. `createFlow.tsx` runs an effect on every `leagueSelection` change that calls
`runGeneration`, but `runGeneration` is gated on `canStartGeneration`, which is false in
`Ready`. So the second scope is recorded on the session, carried into `ReviewPane`'s
`League scope:` row, and never generated. The user gets the world built from their *first*
choice, with no signal that their second one was ignored.

Found while resolving [02 — Selected club in the creation session](02-selected-club-in-the-creation-session.md).
That ticket fixes the half it owns — a club selection bound to the world it was picked from
cannot survive into `commitCareer` as a dangling id — and deliberately leaves this half here,
because the fix is a generation-lifecycle change, not a selection one.

**This is currently invisible.** `CONTEXT.md`'s generation boundary records that `beginCareer`
materializes the same fixed 20-club League whatever scope was chosen, so today the wrong world
is indistinguishable from the right one. It stops being invisible the moment generation honours
the snapshot, at which point it is a silent data bug with no owner. That is why it is a ticket
now rather than a comment.

Decisions this ticket owns:

- **Does a changed scope regenerate at all?** Or is the scope frozen at first generation, with
  Step 1 read-only or the Back affordance removed once a world exists?
- **If it regenerates, what happens to the world in flight or on disk?** The provisional save
  has to be discarded, and `generation.ts` models abandonment as a state a late arrival lands in
  precisely because a `beginCareer` can still be running. A rescope is a second producer of that
  race and needs the same care.
- **Is a scope change the same event as abandonment?** `abandon` currently means "the player
  left creation". Reusing it for "the player changed their mind about scope" either widens that
  meaning or needs its own transition.
- **What does the user see?** Silently rebuilding the world under someone who thought they were
  editing one field is its own surprise. Whether a rescope needs confirmation — and what it says
  about the club they may have already picked — is part of this.
- **What is "different"?** `LeagueSelectionSnapshot` equality: a user who reopens Step 1 and
  re-submits an identical selection must not trigger a rebuild.

## Notes

Not blocked. 02's binding means a rescope can never produce a dangling club id whatever this
ticket decides, so the two are independent.

## Answer

**Closed out of scope** by ticket 08 on assembling the spec. This question sits past the
club-selection map's destination: the regenerate-or-freeze decision, the abandonment-race
handling for a world in flight or on disk, whether a rescope reuses `abandon` or gets its own
transition, what the user sees (confirmation, and what it says about a club already picked), and
the `LeagueSelectionSnapshot`-equality definition of "different" are all generation-lifecycle
decisions. They are untestable today (the same fixed 20-club League generates whatever scope was
chosen, so a wrong world is indistinguishable from the right one) and become real bugs only when
generation honours the snapshot — which is the multi-league world-generation effort, out of scope
here per CONTEXT.md's recorded generation boundary.

The dangling-id half of this problem was owned and fixed by [02 — Selected club in the creation
session](02-selected-club-in-the-creation-session.md): the world-bound `clubSelection` record and
the `selectedClubOf` read helper mean a rescope can never reach `commitCareer` with a stale club
id, whatever this ticket's eventual owner decides.

Recorded on the [club-selection map](../map.md) under Out of scope. Returns only if a generation
effort redraws the destination — then as a fresh effort, not a resumption. No Agent Note (pure
scoping call).
