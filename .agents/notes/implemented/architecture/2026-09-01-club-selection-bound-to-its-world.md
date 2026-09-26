# Agent Note: The club selection is bound to the world it was picked from

Status: implemented

## Problem

`router/createFlow.tsx:331` passes `selectedClubId: ClubId.make("temp-club-id")` into
`commitCareer`. `CreationSession` carries no club field at all, and the Club Selection screen has no
selection affordance — so there is nothing for the field to hold yet, and nothing downstream that
would notice if it held the wrong thing.

Adding `selectedClubId: ClubId | null` is the obvious move and it is one invariant away from a
dangling foreign key. A club id is only meaningful against the provisional world that generated it.
`commitCareer` runs `UPDATE clubs SET is_user_club = 1 WHERE id = ${selectedClubId}`, which matches
zero rows for an unknown id without complaint; the career then commits with no user club, and
`squad.ts`'s `WHERE is_user_club = 1 LIMIT 1` finds nothing on the first screen the player sees.

The flow is *currently* safe from this by accident. `canStartGeneration` is true only in `Pending`
and `Failed`, and `ClubSelectionScreen` mounts only in `Ready`, so no second world can appear while a
club is pickable. Nothing in the club code states that invariant, tests it, or would notice losing
it.

## Decision

**The selection carries the world it was picked from.**

```ts
readonly clubSelection: {
  readonly clubId: ClubId;
  readonly clubName: string;
  readonly provisionalId: SaveId;
} | null;
```

`null` means no club has been chosen against the current world — both the first-paint state (ticket
01 settled that there is no auto-selection) and the state a world swap produces. `clubName` rides
along because Step 3 renders it, and `getClubSelection`'s rows live inside `ClubSelectionScreen` and
die with it.

**One write path.** `CreateSessionApi` gains
`selectClub: (club: { clubId, clubName } | null) => void`, which reads
`provisionalIdOf(session.generation)` itself and writes both halves, or no-ops outside `Ready`. It
takes one nullable record rather than the two arguments this note first proposed, because the
listbox's Space toggles a pick off as well as on: a separate clear would have been a second write
path, which is the one property this decision exists to keep.
Recording a club against a world that is not the current one becomes impossible rather than
discouraged. This is the shape the context already has — `retryGeneration` is an intent, not a patch
hole.

**One read path.** `selectedClubOf(session)` in `renderer/create/`, beside `provisionalIdOf`, returns
`null` when `clubSelection` is `null` *or* when its `provisionalId` does not match the current
generation state. Silent coercion: the stale record is left in place and nothing writes it back.

**Continue is gated on it.** Step 2's `Next: Review` is disabled while `selectedClubOf` is `null`,
with an `aria-describedby` line reading "Choose a club to continue." — the disabled-button-plus-stated-reason
pattern Step 1 already uses for `blockedReason`.

**The selection survives back-navigation**, with no mechanism of its own: stepping back to Step 1 and
forward again re-opens on the same club because the helper still matches. Step 1 collects manager
identity; it has nothing to do with which club.

**The boundary rejects an unknown id.** `commitCareer`'s error union becomes
`Schema.Union([InvalidPillarDistributionError, ClubNotFoundError])`, reusing the existing
`ClubNotFoundError`. Renderer copy: "That club is no longer available. Choose another."

**`ReviewPane` gains a `Club:` row** showing the club name.

## Alternatives considered

- **`selectedClubId: ClubId | null`, cleared by whoever remembers.** One field cheaper and correct
  today. Rejected because its correctness rests on an invariant stated nowhere; the binding costs a
  `SaveId` and makes the bug class unrepresentable to readers instead of merely unreached.

- **Eager clearing on mismatch** — an effect writes `clubSelection: null` when the binding fails.
  Rejected: a state-writing effect whose only job is to make a derived value agree with itself, in a
  flow that already needs `mountedRef` and `generationRunRef` to keep such effects honest.

- **Gate at Step 3's `Create Career` instead of Step 2's Continue.** Rejected: it lets the player
  walk past the one decision the screen exists to collect, and Step 3 has no Back affordance to send
  them back with.

- **`Effect.die` on an unknown club id**, treating it as a renderer defect. Rejected: `commitCareer`
  is an IPC surface decoding an untrusted payload in `rpcServer.ts`. The transaction rolls back
  either way, so the recoverable channel costs nothing and lets the flow say something.

- **A new `UnknownSelectedClubError`.** Rejected: identical condition to `ClubNotFoundError`, and a
  second class for the same fact splits the renderer's handling for nothing.

- **Re-querying the club name on Step 3.** Rejected: one string, one extra round trip, and a review
  step that is no longer a pure render of session state.

## Consequences

What shipped:

- `CreationSession.clubSelection` carries `provisionalId` alongside `clubId`, and the only way to
  write it is `selectClub`, whose `null` argument is also the only way to clear it.
- With a club selected, replacing the generation state with a `Ready` carrying a different
  `provisionalId` makes `selectedClubOf` return `null` — asserted directly, not through the UI.
- Step 2's Continue is disabled with a stated reason until a club is picked.
- Step 2 → Step 1 → Step 2 re-opens on the same club, panel populated.
- `commitCareer` with an id matching no club fails with `ClubNotFoundError` and leaves `save_meta`
  unwritten, so the career is not discoverable.
- `ReviewPane` shows the chosen club's name.
- No `temp-club-id` remains in the renderer.

What it costs:

- **`selectClub`'s no-op outside `Ready` is silent.** A caller that fires while generation is not
  ready loses the click with no feedback. Acceptable because the only affordances that can call it
  are mounted exclusively in `Ready`, but it is a lie waiting for a third caller.
- **The stale record is retained, not cleared.** Anything that reads `session.clubSelection` directly
  rather than through `selectedClubOf` sees a club that the rest of the app considers unselected.
  This is the cost of not writing state from an effect; it needs the helper to be the documented
  and only read path.
- **`ClubNotFoundError` widens `commitCareer`'s error union**, so every existing caller's exhaustive
  handling has to grow a branch.

## Related

- Ticket: `.scratch/club-selection/issues/02-selected-club-in-the-creation-session.md`
- Layout and the no-auto-selection call this depends on:
  [The Club Selection two-column workspace](2026-09-01-club-selection-workspace-shape.md)
- The other half of the world-swap problem, spun out:
  `.scratch/club-selection/issues/09-league-rescope-after-generation.md`
- The lifecycle this binds against: `apps/desktop/src/renderer/create/generation.ts`
- Error-channel precedent: [Tagged domain errors for game-engine invariants](2026-08-29-tagged-domain-errors.md)
