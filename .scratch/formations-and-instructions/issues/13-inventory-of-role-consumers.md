# 13: Inventory of Role consumers

Type: task
Blocked by: None (can start immediately)
Status: resolved

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

## Answer

**Role reaches four areas: the tactics domain and its storage, the match engine's ±0.05 fit bump,
the tactics screens, and contract offers plus the `PlayerSigned` event.** Found by grepping
`packages/*/src`, `apps/desktop/src`, `CONTEXT.md` and `.agents/notes` on 2026-09-29, excluding
staff roles, ARIA roles and CSS design-token "roles". Tests follow the code they cover and are not
listed.

| Consumer | Reads Role for | Classification |
|---|---|---|
| `shared/rules/tactics.ts`: `ROLES`, `Role`, `POSITION_ROLES`, `ROLE_WEIGHTS` | the Role vocabulary, slot→Role, Role Weights | delete |
| `shared/rules/ratings.ts`: `roleRating` | Role Rating | delete; successor (if any) from ticket 07 |
| `game-engine/match/tactical-modifiers.ts`: `ResolvedSlot.role`, `roleBump` | ±0.05 per-phase fit bump | replace per tickets 07 and 08 |
| `game-engine/match/commentary.ts`, `simulate/teamState.ts` | doc comments only | edit comments |
| `contracts/schemas/tactics.ts`: `RoleSchema`, slot `role`, assignment `role`/`roleRating` | `ChangeTactics` payload, overview snapshot | replace with player instructions (07) and the domain model (04) |
| `contracts/schemas/match.ts`: `TeamSheetPlayerView.role`; `main/match/teamSheet.ts` | team sheet label | replace with the positional label from player-positional-model ticket 08, or delete |
| `db/schema.ts`: `tactic_slots.role` column | stored slot Role | delete; instruction storage per ticket 04 |
| `main/club/tactics.ts` | read/write `role`, reject a mismatched Role | delete; instruction validation replaces it |
| `main/club/tacticsOverview.ts` | Role Rating per assignment | successor from ticket 07 |
| `main/club/aiClubs.ts` | AI slot Role | replace per ticket 11 |
| Contract offer: `contracts/rpc.ts` `signFreeAgent.role`, `contracts/schemas/transfers.ts` (error, `ContractOfferView` doc), `main/transfers/{commands,contractOffer}.ts`, `renderer/transfers/{ContractOfferTerms.tsx,useTransferCommands.ts}` | the offer names a Role derived from one of the player's Positions | replace with the Position the Role was derived from; a CM-style squad status on contracts is out of this effort's reach (group-j) |
| `main/transfers/bids.ts`: `playerSignedEvent` payload `role` | JSON event payload | replace with `position`; no migration (saves are disposable) |
| Renderer tactics: `TacticsScreen.tsx`, `useTacticDraft.ts`, `TeamSelectionGrid.tsx`, `OverviewPitch.tsx`, `overviewCards.tsx`, `overviewFormat.ts` `roleLabel` | Role and Role Rating columns, draft slot Role | replace per ticket 12. `TeamSelectionGrid.tsx` is uncommitted work of a parallel session on 2026-09-29 |
| `main/transfers/playerComparison.ts`, `contracts/schemas/playerComparison.ts` | "position/role fit" wording only | edit comments |
| `CONTEXT.md` lines ~79-81, 154-156, 236, 253-281, 906, 916 | Position's avoid-note, Tactical Modifiers, Role/Role Weights/Role Rating/Tactic entries, rating-table examples | rewrite in the implementation sequence |
| Agent Notes: role-rating-outside-match-engine, the-tactics-overview-snapshot-read, templated-match-commentary, formula-driven-transfer-economy, contextual-help-mechanical-provenance, agent-patterns/effect-schema | mention or rely on Role | first gets `Superseded in part`; the rest get their mentions corrected |

Out of reach: none beyond the contract squad-status question above. No Agent Note: an inventory.

Amended 2026-09-29: contract offers and the `PlayerSigned` event drop the positional designation
entirely rather than naming a Position, since Positions are replaced and CM 03/04 contracts named
none ([player-positional-model ticket 06](../../player-positional-model/issues/06-classify-position-consumers.md)).
