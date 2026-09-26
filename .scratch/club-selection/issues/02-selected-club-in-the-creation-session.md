# 02 — Selected club in the creation session

Type: grilling
Status: resolved

## Question

Where does the chosen club live, and what makes it survive into the committed career?

`router/createFlow.tsx:331` currently hardcodes `selectedClubId: ClubId.make("temp-club-id")`
into the `commitCareer` call. `CreationSession` carries `leagueSelection`, `saveName`,
`managerName`, `archetype`, `pillars`, `generation`, `commit`, and `error` — no club. The
screen has no selection affordance at all.

Decisions this ticket owns:

- **The session field.** Presumably `selectedClubId: ClubId | null` on `CreationSession`,
  updated through the existing `update` patch API. Confirm the shape and the null semantics.
- **Continue gating.** Step 2 currently advances unconditionally. Does an unchosen club block
  Continue, and what does the bottom bar say when it does? The bottom-bar content is registered
  per-step through `registerBottomBar`.
- **Invalidation on regeneration.** `retryGeneration` produces a new provisional world with new
  club ids. A `selectedClubId` captured against the old world is stale and would be written
  into `commitCareer` as a dangling foreign key. When does it clear?
- **Back-navigation persistence.** Stepping back to Step 1 and forward again: does the
  selection survive? It does not have to, but the answer has to be deliberate.
- **Validation at the boundary.** `commitCareer` runs
  `UPDATE clubs SET is_user_club = 1 WHERE id = ${selectedClubId}`, which silently updates zero
  rows for an unknown id. Whether the main process should reject an id that matches no club is
  part of this decision.

## Answer

The chosen club lives on `CreationSession` as a record **bound to the provisional world it was
picked from**, written through one intent-named API, and read through one pure helper that treats a
mismatched binding as no selection at all.

### The session field

```ts
readonly clubSelection: {
  readonly clubId: ClubId;
  readonly clubName: string;
  readonly provisionalId: SaveId;
} | null;
```

`null` means no club has been chosen against the current world — which is both the first-paint state
(ticket 01 settled that there is no auto-selection) and the state a world swap produces.

The `provisionalId` is the whole point. A bare `selectedClubId: ClubId | null` is only safe while the
"a new world cannot appear once one is `Ready`" invariant holds, and that invariant is an accident of
`canStartGeneration`'s current shape — not something the club code states, tests, or would notice
losing. Carrying the world id makes a stale selection *unrepresentable to readers* rather than merely
unreached.

`clubName` rides along because Step 3 renders it (below) and `getClubSelection`'s rows live inside
`ClubSelectionScreen` and die with it. Re-querying on the review step to display one string is worse
than carrying it.

**A premise in the question was wrong.** `retryGeneration` cannot strand a selection:
`canStartGeneration` is true only in `Pending` and `Failed`, and `ClubSelectionScreen` mounts only in
`Ready`. Retry is unreachable once a club is pickable. The real hazard next door is that changing
league scope after `Ready` *silently keeps the old world* — see the scope note below.

### Writing it

`CreateSessionApi` gains `selectClub: (clubId: ClubId, clubName: string) => void`. It reads
`provisionalIdOf(session.generation)` itself and writes both halves, or no-ops when generation is not
`Ready`.

Not the raw `update` patch: the binding would then be a convention every caller has to remember, and
there are already two callers — the rail row and ticket 05's `Pick a team for me`. The first
divergence is one commit away. This also matches the shape the context already has: `retryGeneration`
is an intent, not a patch hole.

### Reading it

One pure helper beside `provisionalIdOf` in `renderer/create/`:

```ts
export const selectedClubOf = (session: CreationSession): ClubSelection | null
```

It returns `null` when `clubSelection` is `null` **or** when its `provisionalId` does not match the
current generation state. The stale record is left in place; nothing writes it back to `null`.

Eager clearing was rejected. It needs a state-writing effect whose only job is to make a derived value
agree with itself, and effects that write state during render are exactly what this flow already has
to guard against with `mountedRef` and `generationRunRef`. Silent coercion is one pure function and no
lifecycle.

### Continue gating

**An unchosen club blocks Continue.** Step 2's `Next: Review` is disabled while
`selectedClubOf(session) === null`, with an `aria-describedby` reason line reading **"Choose a club to
continue."** — the same disabled-button-plus-stated-reason pattern Step 1 already uses for
`blockedReason`.

Gating at Step 3's `Create Career` instead was rejected: it lets the user walk past the one decision
the screen exists to collect and discover it a screen later, and Step 3 has no Back affordance to send
them back with.

### Back-navigation persistence

**The selection survives.** Stepping back to Step 1 and forward again re-opens Step 2 on the same
club with the detail panel populated. It is the same world and the same question; Step 1 collects
manager identity, which has nothing to do with which club.

This needs no mechanism of its own — it is just `selectedClubOf` still matching. And it does not
weaken the invalidation guarantee: if the world *is* swapped, the helper returns `null` regardless of
this answer, which is the correct behaviour rather than an exception to it.

### Validation at the boundary

`commitCareer` **rejects an id matching no club**, with the existing `ClubNotFoundError` added to its
error union:

```ts
error: Schema.Union([InvalidPillarDistributionError, ClubNotFoundError])
```

`UPDATE clubs SET is_user_club = 1 WHERE id = ...` matching zero rows is not an error to SQLite, so
today the career commits with no user club and `squad.ts`'s `WHERE is_user_club = 1 LIMIT 1` finds
nothing on the first screen after creation. The commit must fail instead; it is already inside the
transaction, so it rolls back.

A recoverable tagged error, not `Effect.die`: this is an IPC surface decoding an untrusted payload in
`rpcServer.ts`, and the renderer is not its only possible caller. `ClubNotFoundError` is reused rather
than a new `UnknownSelectedClubError` invented — the condition is identical and a second class for the
same fact splits the renderer's handling for nothing. Renderer copy: **"That club is no longer
available. Choose another."**

### Step 3 review

`ReviewPane` gains a `Club:` row showing the club name. A review screen that omits the most
consequential choice is not a review. Name only, not name-plus-tier: the tier is a comparison aid and
there is nothing left to compare against at that point.

### Out of scope, spun out

Changing league scope after `Ready` keeps the world generated from the *first* scope, with no signal
to the user — `runGeneration` is called on every `leagueSelection` change but is a no-op from `Ready`.
The dangling-id half of this is fixed by the binding above; the wrong-world half is a
generation-lifecycle bug, not a selection bug, and fixing it drags an abandon/regenerate race into a
ticket about a session field. Spun out as
[09 — Changing league scope after generation](09-league-rescope-after-generation.md).
