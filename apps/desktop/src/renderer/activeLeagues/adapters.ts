/**
 * The Active Leagues screen's wire→domain adapters. Shared with the League & Nation browser —
 * the single home lives in `leagueSelection/toDomain.ts`; this file re-exports what the setup
 * screen reads so its imports stay local and the naming stays honest.
 */
export {
  toDomainIndex,
  toDomainIntents,
  toDomainResolved,
  toDomainSelection,
} from "../leagueSelection/toDomain.js";