/**
 * Free Agent column definitions (note: shared table layer). Same row renderer
 * as the Market table — TanStack adoption is free once Market is built. The
 * Club cell reads "Free Agent" for every row (`clubName` is null on the wire);
 * the signing path lives in the contextual Actions region, not the row.
 */
export {
  marketPlayerColumns as freeAgentColumns,
  marketPlayerRowOf,
  type MarketPlayerRow,
  type MarketPlayerRow as FreeAgentRow,
} from "./marketColumns.js";