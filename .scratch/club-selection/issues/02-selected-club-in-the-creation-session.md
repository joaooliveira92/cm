# 02 — Selected club in the creation session

Type: grilling
Status: open

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
