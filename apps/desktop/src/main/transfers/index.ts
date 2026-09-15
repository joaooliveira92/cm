/**
 * The transfer subsystem's public surface — every symbol `main/transfers.ts` exported before it
 * became this directory, and nothing more. Call sites changed their import *path* and not one of
 * the names they ask for.
 *
 * The modules behind it, in the order a transfer moves through them: `economics` (a player's
 * rating, age and Transfer Value, the numbers every other module prices against), `budgets` (each
 * club's Transfer and Wage Budget, seeded per season and spent down), `bids` (the `bids` rows and
 * the transfer completion they settle into), `ai` (how an AI club answers a Bid and issues its
 * own), and `commands` (the human manager's Bid/respond/sign/renew surface and the screen it
 * reads back).
 */

export { aiPlaceBid, aiSignFreeAgent, decideAiSellerResponse, resolveAiCounterOffer } from "./ai.js";
export { expireContractsForSeason, initializeSeasonEconomy, loadClubBudgetRow, loadWageBudgetUsed } from "./budgets.js";
export {
  getTransfersScreen,
  placeBid,
  renewContract,
  respondAsBidder,
  respondToBid,
  signFreeAgent,
} from "./commands.js";
export { loadAllPlayersEcon } from "./economics.js";
