# 13: Inventory of Role consumers

Type: task
Blocked by: None (can start immediately)

## Question

List every consumer of Role, Role Weights and Role Rating across `packages/`, `apps/desktop/`,
`CONTEXT.md` and `.agents/notes/`, with what each reads it for, so the removal is complete and
ticket 07 knows which jobs need a successor. Known starting points: `POSITION_ROLES`,
`ROLE_WEIGHTS` and `ROLES` in `shared/rules/tactics.ts`; Role Rating in `shared/rules/ratings.ts`
and `game-engine/match/tactical-modifiers.ts`; the Role on contract offer terms
(`contracts/schemas/transfers.ts`, `ContractOfferTerms.tsx`); `roleRating` in the tactics contracts
and screens; match commentary; `aiClubs.ts`. Classify each as: delete, replace with a player
instruction, replace with something else (say what), or out of this effort's reach. Record the
list as this ticket's answer.
